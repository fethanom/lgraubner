import { resolveSource, normalizeMap, splitType, splitContent } from '../src/utils'

function add() {
  console.log('add')
}

test('test resolveSource', () => {
  expect(resolveSource(action, add)).toBe(action[add])
})

test('test normalizeMap', () => {
  expect(normalizeMap(['add', 'cut'])).toBe([{ k: 'add', v: 'add' }, { k: 'cut', v: 'cut' }])
  expect(normalizeMap([add])).toBe([{ k: 'add', v: add }])
})

test('test splitType', () => {
  expect(splitType('add')).toBe('add')
  expect(splitType(add)).toBe(add)
  expect(splitType('count/add')).toBe(['count', 'add'])
})

test('test splitContent', () => {
  expect(splitContent(['count/add','count/cut'])).toBe(['add','cut'])
})