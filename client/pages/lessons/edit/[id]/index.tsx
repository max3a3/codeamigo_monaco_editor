import { useLessonQuery } from '@generated/graphql';
import StepForm from '@widgets/Lesson/StepForm';
import Steps from '@widgets/Lesson/Steps';
import { NextPage } from 'next';
import React, { useState } from 'react';

const EditLesson: NextPage<{ id: string }> = (props) => {
  const id = parseInt(props.id);
  const [currentStepId, setCurrentStepId] = useState(0);
  const [showSteps, setShowSteps] = useState(false);

  const { data } = useLessonQuery({
    variables: { id },
  });

  const toggleShowSteps = () => {
    setShowSteps(!showSteps);
  };

  if (!data) return null;
  if (!data.lesson) return null;
  if (!data.lesson.steps) return null;

  const stepId = currentStepId || data.lesson.steps[0].id;

  return (
    <div className="flex">
      {showSteps && (
        <div className="w-full absolute top-0 left-0 h-full bg-white bg-opacity-90 py-3 px-4 pl-10 z-10 md:w-2/12">
          <Steps
            steps={data.lesson.steps}
            lessonId={data.lesson.id}
            currentStepId={stepId}
            setCurrentStepId={setCurrentStepId}
            toggleShowSteps={toggleShowSteps}
          />
        </div>
      )}
      <div className="w-full h-screen">
        <StepForm
          lesson={data.lesson}
          currentStepId={stepId}
          toggleShowSteps={toggleShowSteps}
        />
      </div>
    </div>
  );
};

EditLesson.getInitialProps = ({ query }) => ({
  id: query.id as string,
});

export default EditLesson;
