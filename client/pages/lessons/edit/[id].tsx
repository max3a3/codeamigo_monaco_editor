import { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useState } from 'react';

import { useLessonQuery, useMeQuery } from '👨‍💻generated/graphql';
import Info from '👨‍💻widgets/Lesson/Info';
import Step from '👨‍💻widgets/Lesson/Step';
import Steps from '👨‍💻widgets/Lesson/Steps';

const EditLesson: NextPage<{ id: string }> = (props) => {
  const id = parseInt(props.id);
  const [currentStepId, setCurrentStepId] = useState(0);
  const [showSteps, setShowSteps] = useState(false);

  const router = useRouter();
  const { data: meData } = useMeQuery();
  const { data, loading } = useLessonQuery({
    variables: { id },
  });

  if (!data) return null;
  if (!data.lesson) return null;
  if (!data.lesson.steps) return null;

  if (data.lesson.owner.id !== meData?.me?.id) {
    if (typeof window !== 'undefined') {
      router.push('/');
      return null;
    }
  }

  const stepId = currentStepId || data.lesson.steps[0].id;

  return (
    <div className="flex">
      <Steps
        currentStepId={stepId}
        isEditing
        lessonId={data.lesson.id}
        setCurrentStepId={setCurrentStepId}
        setShowSteps={setShowSteps}
        showSteps={showSteps}
        steps={data.lesson.steps}
      />
      <div className="lg:overflow-hidden w-full md:h-screen">
        <Info isEditing lesson={data.lesson} />
        <Step
          currentStepId={stepId}
          isEditing
          lesson={data.lesson}
          setCurrentStepId={setCurrentStepId}
          setShowSteps={setShowSteps}
          showSteps={showSteps}
        />
      </div>
    </div>
  );
};

EditLesson.getInitialProps = ({ query }) => ({
  id: query.id as string,
});

export default EditLesson;
