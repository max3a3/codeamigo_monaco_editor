const validExt = ['js', 'jsx', 'ts', 'tsx', 'css', 'html'];

export const isValidName = (
  name: string,
  files?: Array<string>
): { reason: string; valid: boolean } => {
  let result = { reason: '', valid: true };

  if (!name.includes('.') || !name.split('.')[1]) {
    result.valid = false;
    result.reason = 'File name must include an extension.';
    return result;
  }

  if (!validExt.includes(name.split('.')[1])) {
    result.valid = false;
    result.reason = `File extension ${name.split('.')[1]} is not allowed.`;
    return result;
  }

  if (files && files.includes(name)) {
    result.valid = false;
    result.reason = 'Filename already taken.';
    return result;
  }

  if (name.split('.')[1] === 'html' && files && files.includes('index.html')) {
    result.valid = false;
    result.reason = 'Only index.html allowed.';
    return result;
  }

  if (name.split('.')[1] === 'html' && name.split('.')[0] !== 'index') {
    result.valid = false;
    result.reason = 'Only index.html allowed.';
    return result;
  }

  if (name.split('.')[1] === 'css' && files && files.includes('styles.css')) {
    result.valid = false;
    result.reason = 'Only styles.css allowed.';
    return result;
  }

  if (name.split('.')[1] === 'css' && name.split('.')[0] !== 'styles') {
    result.valid = false;
    result.reason = 'Only styles.css allowed.';
    return result;
  }

  return result;
};
