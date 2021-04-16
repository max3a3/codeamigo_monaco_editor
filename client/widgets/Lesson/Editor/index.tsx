import { useReactiveVar } from '@apollo/client';
import { ControlledEditor, monaco } from '@monaco-editor/react';
import { debounce } from 'debounce';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CodeSandboxV1ResponseI } from 'types/codesandbox';

import { isTestingVar } from '👨‍💻apollo/cache/lesson';
import { modalVar } from '👨‍💻apollo/cache/modal';
import Button from '👨‍💻components/Button';
import Icon from '👨‍💻components/Icon';
import { Spinner } from '👨‍💻components/Spinners/index';
import {
  LessonQuery,
  RegularDependencyFragment,
  RegularStepFragment,
  StepDocument,
  StepQuery,
  useCompleteCheckpointMutation,
  useCreateCodeModuleMutation,
  useDeleteCodeModuleMutation,
  useMeQuery,
  usePassCheckpointMutation,
  useUpdateCodeModuleMutation,
} from '👨‍💻generated/graphql';

import * as THEMES from '../../../styles/monacoThemes';
// import { CodeSandboxV2ResponseI } from '../../../types/codesandbox';
import EditorFiles from '../EditorFiles';
import { FilesType, FromTestRunnerMsgType, ToPreviewMsgType } from './types';
import { camalize, getModelExtension } from './utils';

const FILE = 'file:///';
const CS_TYPES_URL =
  'https://prod-packager-packages.codesandbox.io/v1/typings/@types';
const CS_TYPES_FALLBACK_URL =
  'https://prod-packager-packages.codesandbox.io/v1/typings';

const Editor: React.FC<Props> = ({ nextStep, step, ...rest }) => {
  const router = useRouter();
  const editorRef = useRef<any>();
  const monacoRef = useRef<any>();
  const submitRef = useRef<any>();

  // const [files, setFiles] = useState({} as FilesType);
  const [currentPath, setCurrentPath] = useState('');
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isBundlerReady, setIsBundlerReady] = useState(false);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const isTesting = useReactiveVar(isTestingVar);

  const [createCodeModule] = useCreateCodeModuleMutation();
  const [updateCodeModule] = useUpdateCodeModuleMutation();
  const [deleteCodeModule] = useDeleteCodeModuleMutation();

  const [completeCheckpointM] = useCompleteCheckpointMutation();
  const [passCheckpoint] = usePassCheckpointMutation();

  const { data: meData } = useMeQuery();

  const files = step?.codeModules?.reduce(
    (acc, curr) => ({ ...acc, [curr.name as string]: curr.value }),
    {}
  ) as FilesType | undefined;

  const dependencies = step.dependencies;

  useEffect(() => {
    return () => {
      isTestingVar(false);
    };
  }, []);

  useEffect(() => {
    const handleBundlerReadyMessages = (e: MessageEvent) => {
      if (e.data.from === 'bundler') {
        setIsBundlerReady(e.data.bundlingState === 'Symbol(BUNDLING_FINISHED)');
      }
    };

    window.addEventListener('message', handleBundlerReadyMessages);
    return () =>
      window.removeEventListener('message', handleBundlerReadyMessages);
  }, []);

  useEffect(() => {
    const handleWorkerReadyMessages = (e: MessageEvent) => {
      if (e.data.from === 'bundler') {
        setIsWorkerReady(e.data.workerState === 'Symbol(WORKER_STATE_SUCCESS)');
      }
    };

    window.addEventListener('message', handleWorkerReadyMessages);
    return () =>
      window.removeEventListener('message', handleWorkerReadyMessages);
  }, []);

  // Change Step
  useEffect(() => {
    if (!step.codeModules) return;
    if (!isEditorReady) return;
    if (!isWorkerReady) return;
    if (!files) return;

    goToMain(files);
  }, [step.id, step.codeModules, isEditorReady, isWorkerReady]);

  // Files changed => set up editor models
  useEffect(() => {
    if (isEditorReady && files) {
      setupModels();
    }
  }, [files, isEditorReady]);

  // Path changed => set current model
  useEffect(() => {
    if (isEditorReady) {
      setModel(currentPath);
    }
  }, [currentPath]);

  // Dependencies changed => update bundle
  useEffect(() => {
    if (!files) return;
    postCode(files, currentPath, files[currentPath], step.dependencies || []);
  }, [step.dependencies]);

  // Dependencies changed => setup types
  useEffect(() => {
    if (!step.dependencies) return;
    if (!isEditorReady) return;
    setupTypes();
  }, [step.dependencies, isEditorReady]);

  useEffect(() => {
    const handlePassCheckpoint = async (message: {
      data: FromTestRunnerMsgType;
    }) => {
      if (message.data.from !== 'testRunner') return;
      if (message.data.type !== 'test') return;
      // don't pass checkpoint if editting
      if (rest.isEditing) {
        isTestingVar(false);
        return;
      }

      try {
        const result = JSON.parse(message.data.result);

        if (
          result[result.length - 1].status === 'pass' &&
          step.currentCheckpointId
        ) {
          // prompt register if previewing
          if (rest.isPreviewing) {
            isTestingVar(false);
            modalVar({
              callback: () =>
                rest?.lesson?.id &&
                router.push(`/lessons/start/${rest.lesson.id}`),
              name: 'registerAfterPreview',
            });
            return;
          }

          await passCheckpoint({
            variables: { id: step.currentCheckpointId },
          });

          // if it's the last checkpoint also complete it
          if (
            step.checkpoints &&
            step.checkpoints.findIndex(
              ({ id }) => id === step.currentCheckpointId
            ) ===
              step.checkpoints.length - 1
          ) {
            await completeCheckpoint();
          }
        }
        isTestingVar(false);
      } catch (e) {
        console.log(e);
      }
    };

    window.addEventListener('message', handlePassCheckpoint);

    return () => window.removeEventListener('message', handlePassCheckpoint);
  }, [step.currentCheckpointId]);

  const completeCheckpoint = async () => {
    // don't complete checkpoint if editting
    if (rest.isEditing) return;
    if (!step.currentCheckpointId) return;

    const q = {
      query: StepDocument,
      variables: { id: step.id },
    };
    await completeCheckpointM({
      update: (store) => {
        const stepData = store.readQuery<StepQuery>(q);
        if (!stepData?.step) return;

        // TODO: refactor this
        const nextCheckpointId = stepData?.step?.checkpoints?.find(
          ({ isCompleted }) => !isCompleted
        )?.id;

        store.writeQuery<StepQuery>({
          ...q,
          data: {
            step: {
              ...stepData.step,
              currentCheckpointId:
                nextCheckpointId || stepData.step.currentCheckpointId,
            },
          },
        });
      },
      variables: { id: step.currentCheckpointId },
    });
  };

  const createFile = async (file: string) => {
    const value = ``;

    await createCodeModule({
      refetchQueries: ['Step'],
      variables: { name: file, stepId: step.id, value },
    });

    monacoRef.current.editor.createModel(
      files![file],
      getModelExtension(file),
      `${FILE}${step.id}-${file}`
    );

    setCurrentPath(file);
  };

  const deleteFile = async (file: string) => {
    const module = step?.codeModules?.find((module) => module.name === file);

    if (!module) return;
    if (!files) return;

    monacoRef.current.editor.getModel(`${FILE}${step.id}-${file}`).dispose();

    // delete module
    await deleteCodeModule({
      refetchQueries: ['Step'],
      variables: { id: module.id },
    });

    goToMain(files);
  };

  const updateFile = useCallback(
    debounce(async (path: string, code: string) => {
      const currentModule = step?.codeModules?.find(
        (module) => module.name === path
      );

      if (!currentModule) return;

      await updateCodeModule({
        variables: {
          id: currentModule.id,
          lessonId: rest.isPreviewing ? rest?.lesson?.id : null,
          name: path,
          value: code,
        },
      });
    }, 500),
    [step.codeModules]
  );

  const postMessage = (
    files: FilesType,
    runPath: string,
    value: string,
    dependencies: RegularDependencyFragment[],
    isTest?: boolean
  ) => {
    const iframe = document.getElementById('frame') as HTMLIFrameElement;
    if (!iframe) return;
    const iframeContentWindow = iframe.contentWindow;
    if (!iframeContentWindow) return;

    const newFiles = { ...files, [runPath]: value };
    // assets for parcel
    const assets = Object.keys(newFiles).map((file) => ({
      content: newFiles[file],
      // parcel entry is different than codeModule entry
      isEntry: isTest ? file === runPath : file === 'index.html',
      name: file,
    }));

    // send files and path to iframe
    iframeContentWindow.postMessage(
      {
        assetBuffer: Buffer.from(JSON.stringify(assets), 'utf-8'),
        dependencies,
        from: 'editor',
        isTest,
        runPath,
      } as ToPreviewMsgType,
      '*'
    );
  };

  const prepareAssets = (files: FilesType) => {
    const assets = Object.keys(files).reduce((acc, cur) => {
      if (!cur.includes('spec')) {
        acc[cur] = files[cur];
      }

      return acc;
    }, {} as { [key in string]: string });
    return assets;
  };

  const postCode = useCallback(
    debounce(
      (
        files: FilesType,
        runPath: string,
        value: string,
        dependencies: RegularDependencyFragment[]
      ) => {
        const assets = prepareAssets(files);
        postMessage(assets, runPath, value, dependencies);
      },
      500
    ),
    []
  );

  const testCode = (
    files: FilesType,
    currentPath: string,
    testPath: string,
    dependencies: RegularDependencyFragment[]
  ) => {
    isTestingVar(true);
    const testValue = monacoRef.current.editor
      .getModel(`${FILE}${step.id}-${testPath}`)
      .getValue();
    const currentValue = monacoRef.current.editor
      .getModel(`${FILE}${step.id}-${currentPath}`)
      .getValue();

    postMessage(
      { ...files, [currentPath]: currentValue },
      testPath,
      testValue,
      dependencies,
      true
    );

    // fallback if test-runner fails to post
    setTimeout(() => {
      isTestingVar(false);
    }, 3000);
  };

  const setupCompilerOptions = () => {
    const jsxFactory = 'React.createElement';
    const reactNamespace = 'React';
    const hasNativeTypescript = false;

    // https://github.com/codesandbox/codesandbox-client/blob/master/packages/app/src/embed/components/Content/Monaco/index.js
    monacoRef.current.languages.typescript.typescriptDefaults.setCompilerOptions(
      {
        allowJs: true,
        allowNonTsExtensions: !hasNativeTypescript,
        experimentalDecorators: true,
        jsx: monacoRef.current.languages.typescript.JsxEmit.React,
        jsxFactory,
        module: hasNativeTypescript
          ? monacoRef.current.languages.typescript.ModuleKind.ES2015
          : monacoRef.current.languages.typescript.ModuleKind.System,
        moduleResolution:
          monacoRef.current.languages.typescript.ModuleResolutionKind.NodeJs,
        // forceConsistentCasingInFileNames:
        //   hasNativeTypescript && existingConfig.forceConsistentCasingInFileNames,
        // noImplicitReturns:
        //   hasNativeTypescript && existingConfig.noImplicitReturns,
        // noImplicitThis: hasNativeTypescript && existingConfig.noImplicitThis,
        // noImplicitAny: hasNativeTypescript && existingConfig.noImplicitAny,
        // strictNullChecks: hasNativeTypescript && existingConfig.strictNullChecks,
        // suppressImplicitAnyIndexErrors:
        //   hasNativeTypescript && existingConfig.suppressImplicitAnyIndexErrors,
        // noUnusedLocals: hasNativeTypescript && existingConfig.noUnusedLocals,
        newLine: monacoRef.current.languages.typescript.NewLineKind.LineFeed,

        noEmit: true,

        reactNamespace,

        target: monacoRef.current.languages.typescript.ScriptTarget.ES2016,

        typeRoots: ['node_modules/@types'],
      }
    );
  };

  const setupDiagnosticsOptions = () => {
    monacoRef.current.languages.typescript.typescriptDefaults.setDiagnosticsOptions(
      {
        noSemanticValidation: true,
        noSyntaxValidation: true,
      }
    );
  };

  const setupCommands = () => {
    editorRef.current.addCommand(
      monacoRef.current.KeyMod.CtrlCmd | monacoRef.current.KeyCode.KEY_S,
      () => {
        editorRef.current.getAction('editor.action.formatDocument').run();
      }
    );

    editorRef.current.addCommand(
      monacoRef.current.KeyMod.CtrlCmd | monacoRef.current.KeyCode.Enter,
      () => {
        submitRef.current.click();
      }
    );
  };

  const setupModels = () => {
    Object.keys(files!).map((file) => {
      if (monacoRef.current.editor.getModel(`${FILE}${step.id}-${file}`))
        return;

      monacoRef.current.editor.createModel(
        files![file],
        getModelExtension(file),
        `${FILE}${step.id}-${file}`
      );
    });
  };

  const setupTypes = async () => {
    let deps: CodeSandboxV1ResponseI;

    step.dependencies?.map(async (dep) => {
      try {
        const initial = await fetch(
          `${CS_TYPES_URL}/${dep.package}/${dep.version}.json`
        );
        deps = await initial.json();
      } catch (e) {
        try {
          const fallback = await fetch(
            `${CS_TYPES_FALLBACK_URL}/${dep.package}/${dep.version}.json`
          );
          deps = await fallback.json();
        } catch (e) {
          console.error(e);
        }
      }

      try {
        Object.keys(deps.files).map((file) => {
          const code = deps.files[file].module.code;

          monacoRef.current.languages.typescript.typescriptDefaults.addExtraLib(
            code,
            `${FILE}node_modules${file}`
          );
        });
      } catch (e) {
        console.error(e);
      }
    });
  };

  const setupThemes = () => {
    let themeName = meData?.me?.theme || 'cobalt';
    let theme = THEMES[themeName as keyof typeof THEMES];
    let standardThemeName = themeName.split('_').map(camalize).join('');
    monacoRef.current.editor.defineTheme(standardThemeName, theme);
    monacoRef.current.editor.setTheme(standardThemeName);
  };

  const setupEditor = () => {
    setupCommands();
    setupCompilerOptions();
    setupDiagnosticsOptions();
    setupThemes();

    setIsEditorReady(true);
  };

  const editorDidMount = async (_: any, editor: any) => {
    const monacoInstance = await monaco.init();

    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    setupEditor();
  };

  const getMain = (files: FilesType, file?: string) => {
    return (
      file ||
      // code module isEntry check here.
      Object.keys(files).find((file) => {
        const mod = step?.codeModules?.find(({ isEntry }) => !!isEntry);
        return mod?.name === file;
      }) ||
      Object.keys(files).find((file) => file === 'app.tsx') ||
      Object.keys(files).find((file) => file === 'index.html') ||
      Object.keys(files).filter((n) => !n.includes('spec'))[0]
    );
  };

  const goToMain = (files: FilesType, file?: string) => {
    const main = getMain(files, file);

    setModel(main);
    setCurrentPath(main);
    const assets = prepareAssets(files);
    postMessage(assets, main, files[main], step.dependencies || []);
  };

  const setModel = (path: string) => {
    editorRef.current.setModel(
      monacoRef.current.editor.getModel(`${FILE}${step.id}-${path}`)
    );
    editorRef.current.focus();
  };

  const currentCheck = step.checkpoints?.find(
    ({ id }) => id === step.currentCheckpointId
  );
  const isTested = currentCheck?.isTested || !currentCheck;
  const isStepComplete = !step.checkpoints?.find(
    (checkpoint) => checkpoint.isCompleted === false
  );

  return (
    <div className="flex w-full lg:h-full lg:overflow-scroll lg:w-2/4">
      <div className="w-full lg:h-full flex flex-col relative">
        <div className="h-80 lg:flex-1 flex border border-bg-nav-offset border-t-0 border-b-0 whitespace-nowrap">
          <div className="w-4/12 border-r border-bg-nav-offset">
            <EditorFiles
              codeModules={step.codeModules}
              createFile={createFile}
              currentPath={currentPath}
              deleteFile={deleteFile}
              dependencies={step.dependencies}
              files={files!}
              setCurrentPath={setCurrentPath}
              stepId={step.id}
              {...rest}
            />
          </div>
          <div className="w-8/12 h-80 lg:h-full">
            <ControlledEditor
              editorDidMount={editorDidMount}
              language={'typescript'}
              onChange={(_, value) => {
                setIsBundlerReady(false);
                updateFile(currentPath, value || '');
                postCode(
                  files!,
                  currentPath,
                  value || '',
                  step.dependencies || []
                );
              }}
              options={{
                automaticLayout: true,
                fontSize: '14px',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
              width="100%"
            />
          </div>
        </div>
        <div className="h-16 flex justify-end px-3 items-center w-full bg-bg-nav border-t border-bg-nav-offset">
          {rest.isPreviewing && (
            <div
              aria-label="Preview Mode. Changes will not be saved! Login to save your work."
              className="hint--top hint--no-animate"
            >
              <div className="flex text-text-primary text-sm mr-3">
                <Icon className="text-text-primary mr-1" name="info-circled" />{' '}
                Preview Mode
              </div>
            </div>
          )}
          <div aria-label="⌘ + Enter" className="hint--top hint--no-animate">
            <Button
              className={`w-20 p-2 justify-center`}
              disabled={isTesting || !isBundlerReady}
              forwardedRef={submitRef}
              onClick={() => {
                isStepComplete
                  ? nextStep()
                  : isTested
                  ? completeCheckpoint()
                  : testCode(
                      {
                        ...files,
                      },
                      currentPath,
                      currentCheck!.test,
                      step.dependencies || []
                    );
              }}
            >
              {isTesting ? <Spinner /> : isTested ? <>Next</> : <>Test</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

type Props = {
  isEditing?: boolean;
  isPreviewing?: boolean;
  lesson: LessonQuery['lesson'];
  nextStep: () => void;
  step: RegularStepFragment;
};

export default Editor;
