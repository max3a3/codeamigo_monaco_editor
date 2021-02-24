import {
  Arg,
  Field,
  InputType,
  Int,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";

import { Checkpoint } from "../entities/Checkpoint";
import { CodeModule } from "../entities/CodeModule";
import { Step } from "../entities/Step";
import { isAuth } from "../middleware/isAuth";

const DEFAULT_TEST = `import { core, enzyme } from 'codeamigo-jest-lite'

const { describe, it, run, expect } = core
const { mount } = enzyme

describe('My Test', () => {
  it('runs', () => {
    expect(true).toBe(true)
  })
})

const runTests = async () => {
  const results = await run()
  console.test(results)
}

runTests()
`;

const VUE_TEST = `import { core, enzyme } from 'codeamigo-jest-lite'

const { describe, it, run, expect } = core
import { mount } from '@vue/test-utils'

import App from './App.vue'

const wrapper = mount(App)

describe('Hello vue', () => {
  it('renders', () => {
    expect(wrapper.find('div').text()).toBe('Hello Vue!')
  })
})

const runTests = async () => {
  const results = await run()
  console.test(results)
}

runTests()
`;

@InputType()
class CreateCheckpointInput {
  @Field()
  checkpointId: number;
  @Field()
  stepId: number;
}

@InputType()
class UpdateCheckpointInput {
  @Field()
  description: string;
}

@Resolver()
export class CheckpointResolver {
  @Query(() => [Checkpoint])
  async checkpoints(@Arg("stepId") stepId: number): Promise<Checkpoint[]> {
    const step = await Step.createQueryBuilder()
      .where("Step.id = :stepId", {
        stepId,
      })
      .leftJoinAndSelect("Step.checkpoints", "checkpoints")
      .addOrderBy("checkpoints.createdAt", "ASC")
      .getOne();

    return step?.checkpoints || [];
  }

  @Query(() => Checkpoint, { nullable: true })
  checkpoint(
    @Arg("id", () => Int) id: number
  ): Promise<Checkpoint | undefined> {
    return Checkpoint.findOne(id);
  }

  @Mutation(() => Checkpoint, { nullable: true })
  @UseMiddleware(isAuth)
  async createCheckpoint(
    @Arg("options") options: CreateCheckpointInput
  ): Promise<Checkpoint | null> {
    let step = await Step.findOne(
      { id: options.stepId },
      { relations: ["codeModules", "dependencies"] }
    );

    if (!step) {
      return null;
    }

    const name = `checkpoint-${options.checkpointId}.spec.ts`;
    // TODO: make more dynamic
    const isVue =
      step.dependencies.find((value) => value.package === "vue") &&
      step.dependencies.find((value) => value.package === "@vue/test-utils");

    const newModule = await CodeModule.create({
      name,
      value: isVue ? VUE_TEST : DEFAULT_TEST,
    }).save();

    step.codeModules.push(newModule);
    await step.save();

    return Checkpoint.create({
      moduleId: newModule.id,
      step,
      test: name,
    }).save();
  }

  @Mutation(() => Checkpoint, { nullable: true })
  @UseMiddleware(isAuth)
  async updateCheckpoint(
    @Arg("id") id: number,
    @Arg("options") options: UpdateCheckpointInput
  ): Promise<Checkpoint | null> {
    const checkpoint = await Checkpoint.findOne(id);
    if (!checkpoint) {
      return null;
    }

    await Checkpoint.update({ id }, { ...options });

    return checkpoint;
  }

  @Mutation(() => Checkpoint, { nullable: true })
  @UseMiddleware(isAuth)
  async completeCheckpoint(@Arg("id") id: number): Promise<Checkpoint | null> {
    const checkpoint = await Checkpoint.findOne(id, {
      relations: ["step"],
    });
    if (!checkpoint) {
      return null;
    }

    checkpoint.isCompleted = true;
    await checkpoint.save();

    const step = await Step.createQueryBuilder()
      .where("Step.id = :stepId", {
        stepId: checkpoint.step.id,
      })
      .leftJoinAndSelect("Step.checkpoints", "checkpoints")
      .addOrderBy("checkpoints.createdAt", "ASC")
      .getOne();

    if (!step) {
      return checkpoint;
    }

    const nextCheckpoint = step.checkpoints.find(
      ({ isCompleted }) => !isCompleted
    );

    console.log("NEXT", nextCheckpoint);

    step.currentCheckpointId = nextCheckpoint?.id || null;
    await Step.save(step);

    return checkpoint;
  }

  @Mutation(() => Checkpoint, { nullable: true })
  @UseMiddleware(isAuth)
  async passCheckpoint(@Arg("id") id: number): Promise<Checkpoint | null> {
    const checkpoint = await Checkpoint.findOne(id);
    if (!checkpoint) {
      return null;
    }

    checkpoint.isTested = true;
    checkpoint.save();

    return checkpoint;
  }

  @Mutation(() => Boolean)
  async deleteCheckpoint(@Arg("id") id: number): Promise<boolean> {
    const checkpoint = await Checkpoint.findOne(id);

    if (!checkpoint) {
      return false;
    }

    await Checkpoint.delete(id);
    await CodeModule.delete(checkpoint.moduleId);
    return true;
  }
}
