import { SandpackBundlerFiles } from '@codesandbox/sandpack-client';
import { useSandpack } from '@codesandbox/sandpack-react';
import React, { useEffect, useRef, useState } from 'react';

import Icon from '👨‍💻components/Icon';
import { RegularCodeModuleFragment } from '👨‍💻generated/graphql';
import { ModuleList } from '👨‍💻widgets/Lesson/EditorFiles/FileExplorer/ModuleList';

import { isValidName } from './validation';

const FilesList: React.FC<Props> = (props) => {
  const { isEditing, name, onCreate, stepId } = props;
  const { sandpack } = useSandpack();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAdding) {
      setTimeout(() => {
        inputRef.current!.focus();
      }, 0);
    }
  }, [isAdding]);

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value;
    const isValid = isValidName(value, Object.keys(sandpack.files));

    if (!value) {
      setIsAdding(false);
      return;
    }

    if (!isValid.valid) {
      setError(isValid.reason);
      return;
    }

    if (value && onCreate) {
      onCreate(value);
    }

    setIsAdding(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && onCreate) {
      const value = event.currentTarget.value;

      const isValid = isValidName(value, Object.keys(sandpack.files));

      if (!isValid.valid) {
        setError(isValid.reason);
        return;
      }

      onCreate(value);
      setIsAdding(false);
    }
  };

  const finalFiles = Object.keys(sandpack.files)
    .filter((val) =>
      name === 'Tests' ? val.includes('spec') : !val.includes('spec')
    )
    .reduce((acc, curr) => {
      return {
        ...acc,
        [curr]: {
          ...sandpack.files[curr],
        },
      };
    }, {} as SandpackBundlerFiles);
  console.log(finalFiles);

  return (
    <>
      <div className="border-b border-t mt-4 first:border-t-0 first:mt-0 border-bg-nav-offset p-1 flex justify-between content-center">
        <span className="text-sm font-semibold text-text-primary">{name}</span>
        {onCreate && isEditing && (
          <Icon
            className="text-sm text-text-primary hover:text-accent cursor-pointer"
            name="plus-circled"
            onClick={() => setIsAdding(true)}
          />
        )}
      </div>
      <div>
        <ModuleList
          activePath={sandpack.activePath}
          files={finalFiles}
          prefixedPath="/"
          selectFile={sandpack.openFile}
          {...props}
        />
        {isAdding && (
          <div className="px-1 pb-2 relative">
            <input
              className="w-full text-xs px-2 py-1"
              onBlur={handleBlur}
              onChange={() => setError('')}
              onKeyDown={handleKeyDown}
              ref={inputRef}
              type="text"
            />
            {error && (
              <div className="text-red-600 text-xs absolute -bottom-2.5">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
      {/* <div>
        {files &&
          files
            .sort((a, b) => (a < b ? -1 : 1))
            .map((path) => (
              <div
                className={`${
                  currentPath === path ? 'bg-bg-nav' : ''
                } flex justify-between w-full px-1 py-1 text-text-primary hover:bg-bg-nav cursor-pointer ${
                  styles.FILE
                }`}
                key={path}
                onClick={() => setActiveFile(path)}
              >
                <div
                  className={`text-xs flex items-center ${
                    loading ? 'opacity-30' : ''
                  }`}
                >
                  <img className="w-3.5 mr-1" src={getImageSrc(path)} />
                  <span>{getFileName(path)}</span>
                  {isEditing && isEntry(path) && (
                    <Icon className={`text-xs ml-1`} name="star" />
                  )}
                  {isEditing && !isEntry(path) && (
                    // update entry file
                    <Icon
                      className={`empty-star hidden text-xs ml-1 ${styles.emptyStar}`}
                      name="star-empty"
                      onClick={() =>
                        updateCodeModuleEntryFile({
                          variables: {
                            newId: codeModules?.find(
                              ({ name }) => name === path
                            )?.id,
                            oldId: codeModules?.find(({ isEntry }) => !!isEntry)
                              ?.id,
                          },
                        })
                      }
                    />
                  )}
                </div>
                {onDelete && isEditing && (
                  <Icon
                    className="text-red-600 text-sm hidden"
                    name="minus-circled"
                    onClick={() => {
                      const yes = window.confirm(
                        'Are you sure you want to delete this file?'
                      );

                      if (yes) {
                        onDelete(path);
                      }
                    }}
                  />
                )}
              </div>
            ))}
        {isAdding && (
          
        )}
      </div> */}
    </>
  );
};

export type Props = {
  codeModules?: RegularCodeModuleFragment[] | null;
  currentPath?: string;
  isEditing?: boolean;
  name: 'Tests' | 'Files';
  onCreate?: (path: string) => void;
  onDelete: (path: string, isDirectory?: boolean) => void;
  onUpdateCodeModuleEntryFile?: (variables: {
    variables: { newId: any; oldId: any };
  }) => void;
  stepId: number;
};

export default FilesList;
