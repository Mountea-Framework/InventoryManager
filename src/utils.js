export const newGuid = () => crypto.randomUUID();

export const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);

export const setPath = (obj, path, val) => {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] == null) cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = val;
};
