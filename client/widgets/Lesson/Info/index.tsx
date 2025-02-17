import { Transition } from '@headlessui/react';
import { useRouter } from 'next/router';
import React, { useState } from 'react';

import Button from '👨‍💻components/Button';
import Icon from '👨‍💻components/Icon';
import { LessonQuery } from '👨‍💻generated/graphql';
import LessonOptions, { Options } from '👨‍💻widgets/Lesson/Info/LessonOptions';
import UserMenu from '👨‍💻widgets/UserMenu';

import Form from './Form';
import View from './View';

export const LessonInfoHeaderHeight = '2.75';

const Info: React.FC<Props> = ({
  isEditing,
  isLessonOwner,
  isPreviewing,
  ...rest
}) => {
  const router = useRouter();
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className="relative">
      <div
        className="flex relative z-30 justify-between items-center py-1 px-3 sm:px-4 w-full bg-bg-nav border-b border-bg-nav-offset-faded"
        style={{ minHeight: `${LessonInfoHeaderHeight}rem` }}
      >
        <div className="flex overflow-x-hidden items-center w-full overflow-ellipsis">
          <div>
            <Icon
              className="mr-2 sm:mr-4 text-lg text-text-primary cursor-pointer"
              name="home"
              onClick={() => router.push('/')}
            />
          </div>
          <div className="md:absolute md:left-1/2 w-full md:w-1/2 min-w-0 md:text-lg font-bold text-center md:transform md:-translate-x-1/2">
            {isEditing ? <Form {...rest} /> : <View {...rest} />}
          </div>
        </div>
        <div className="flex gap-2 sm:gap-4 justify-end items-center pl-2 md:w-1/4">
          {isLessonOwner ? (
            <Button
              className="py-1"
              nature="secondary"
              onClick={() => router.push(`/lessons/edit/${rest.lesson?.id}`)}
            >
              ✏️ Edit
            </Button>
          ) : null}

          <div className="flex items-center">
            {isEditing && rest.lesson ? (
              <LessonOptions
                lessonId={rest.lesson.id}
                setShowOptions={setShowOptions}
                showOptions={showOptions}
              />
            ) : (
              <a
                aria-label="Ask a question on Discord"
                className="hint--bottom-left hint--no-animate"
                href="https://discord.gg/k98Hy9rQ"
                target="_blank"
              >
                <Icon className="text-lg text-text-primary" name="lifebuoy" />
              </a>
            )}
          </div>

          <div className="flex items-center">
            <UserMenu />
          </div>
        </div>
      </div>
      <Transition show={showOptions}>
        <Options {...rest} />
      </Transition>
    </div>
  );
};

type Props = {
  isEditing?: boolean;
  isLessonOwner?: boolean;
  isPreviewing?: boolean;
  lesson: LessonQuery['lesson'];
};

export default Info;
