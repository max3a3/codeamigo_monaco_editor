import {
  SandpackLayout,
  SandpackPreview,
  useActiveCode,
  useSandpack,
} from '@codesandbox/sandpack-react';
import React from 'react';

import Button from '👨‍💻components/Button';
import { CheckpointTypeEnum } from '👨‍💻generated/graphql';
import CTA from '👨‍💻widgets/CTA';
import Console from '👨‍💻widgets/Lesson/Console';
import Editor from '👨‍💻widgets/Lesson/Editor';
import EditorFiles from '👨‍💻widgets/Lesson/EditorFiles';
import Separator from '👨‍💻widgets/Lesson/Separator';
import StepPosition from '👨‍💻widgets/Lesson/StepPosition';
import LessonBottomBarWrapper from '👨‍💻widgets/LessonBottomBarWrapper';

import { Props as OwnProps } from '.';

const SandpackTemplate: React.FC<Props> = (props) => {
  const {
    editorRef,
    files,
    filesHeight,
    filesRef,
    loading,
    maxDragWidth,
    nextStep,
    onDragEnd,
    onRunMatchTest,
    onTestStart,
    prevStep,
    previewRef,
    session,
    step,
    updateWidths,
  } = props;
  const { updateCode } = useActiveCode();
  const { dispatch, sandpack } = useSandpack();
  const { activePath } = sandpack;

  const handleRunTests = () => {
    onTestStart();
    const checkpoint = step.checkpoints?.find(
      ({ id }) => id === step.currentCheckpointId
    );
    if (!checkpoint || checkpoint.isCompleted) {
      props.ctaRef.current?.click();
      return;
    }

    switch (checkpoint.type) {
      case CheckpointTypeEnum.Spec:
        // @ts-ignore
        dispatch({ type: 'run-all-tests' });
        break;
      case CheckpointTypeEnum.Match:
        onRunMatchTest(checkpoint);
    }
  };

  return (
    <SandpackLayout>
      <div
        className="flex z-50 flex-col justify-between w-2/6 md:w-48 border-r sm:border-b-0 bg-bg-primary border-bg-nav-offset-faded"
        ref={filesRef}
        style={{ minHeight: '20rem' }}
      >
        <div className="flex flex-col h-full">
          <div className="h-full">
            <EditorFiles
              activePath={activePath}
              codeModules={step.codeModules}
              lessonId={props.lesson?.id}
              stepId={step.id}
              {...props}
              files={files!}
              selectFile={sandpack.openFile}
            />
          </div>
          <LessonBottomBarWrapper />
        </div>
      </div>
      <div
        className="z-20 w-4/6 md:w-3/6 h-96 md:h-full border-b sm:border-b-0 border-bg-nav-offset"
        ref={editorRef}
        style={{ height: filesHeight, maxHeight: filesHeight }}
      >
        <div className="flex flex-col h-full bg-bg-primary">
          <Editor
            activePath={activePath}
            codeModules={step.codeModules}
            isTyped
            refreshPreview={() => dispatch({ type: 'refresh' })}
            runCode={() => dispatch({ type: 'start' })}
            sessionId={session?.id}
            stepId={step.id}
            updateCode={updateCode}
            {...props}
          />
          <LessonBottomBarWrapper>
            <div>
              <Button
                className="opacity-50 hover:opacity-100 transition-opacity"
                nature="secondary"
                onClick={prevStep}
              >
                👈 Previous
              </Button>
            </div>
            <StepPosition {...props} />
            <CTA
              {...props}
              bundlerReady={
                sandpack.status === 'running' && !!sandpack.bundlerState
              }
              handleRunTests={handleRunTests}
              loading={loading}
              nextStep={nextStep}
              ref={props.ctaRef}
              step={step}
            />
          </LessonBottomBarWrapper>
        </div>
        <Separator
          iframeName="sp-preview-iframe"
          maxDrag={maxDragWidth}
          onChangeX={updateWidths}
          onDragEnd={onDragEnd}
        />
      </div>
      <div
        className="flex flex-col flex-grow w-full md:w-3/6 md:h-full"
        ref={previewRef}
      >
        <SandpackPreview />
        <Console
          runTests={handleRunTests}
          stepId={step.id}
          tabs={step.checkpoints?.length ? ['console', 'tests'] : ['console']}
        />
      </div>
    </SandpackLayout>
  );
};

type Props = OwnProps & {
  files?: { [key in string]: { code: string } };
};

export default SandpackTemplate;
