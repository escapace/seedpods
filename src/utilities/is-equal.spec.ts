import { assert } from 'chai'
import { forEach } from 'lodash-es'
import { isEqual } from './is-equal'

describe('arrays', () => {
  forEach(
    [
      {
        description: 'two empty arrays are equal',
        value1: { a: 'asd', b: 'zxc' },
        value2: { b: 'zxc', a: 'asd' },
        expected: true
      },
      {
        description: 'two empty arrays are equal',
        value1: [],
        value2: [],
        expected: true
      },
      {
        description: 'equal arrays',
        value1: [1, 2, 3],
        value2: [1, 2, 3],
        expected: true
      },
      {
        description: 'not equal arrays (different item)',
        value1: [1, 2, 3],
        value2: [1, 2, 4],
        expected: false
      },
      {
        description: 'not equal arrays (different length)',
        value1: [1, 2],
        value2: [1, 2, 3],
        expected: false
      },
      {
        description: 'not equal arrays (different length)',
        value1: [1, 2, 3],
        value2: [1, 2],
        expected: false
      },
      {
        description: 'equal arrays of objects',
        value1: [{ a: 'a' }, { b: 'b' }],
        value2: [{ a: 'a' }, { b: 'b' }],
        expected: true
      },
      {
        description: 'not equal arrays of objects',
        value1: [{ a: 'a' }, { b: 'b' }],
        value2: [{ a: 'a' }, { b: 'c' }],
        expected: false
      },
      {
        description: 'pseudo array and equivalent array are not equal',
        value1: { '0': 0, '1': 1, length: 2 },
        value2: [0, 1],
        expected: false
      },
      {
        description: 'two empty arrays are equal',
        value1: [],
        value2: [],
        expected: true
      },
      {
        description: 'equal arrays',
        value1: [1, 2, 3],
        value2: [1, 2, 3],
        expected: true
      },
      {
        description: 'not equal arrays (different item)',
        value1: [1, 2, 3],
        value2: [1, 2, 4],
        expected: false
      },
      {
        description: 'not equal arrays (different length)',
        value1: [1, 2, 3],
        value2: [1, 2],
        expected: false
      },
      {
        description: 'equal arrays of objects',
        value1: [{ a: 'a' }, { b: 'b' }],
        value2: [{ a: 'a' }, { b: 'b' }],
        expected: true
      },
      {
        description: 'not equal arrays of objects',
        value1: [{ a: 'a' }, { b: 'b' }],
        value2: [{ a: 'a' }, { b: 'c' }],
        expected: false
      },
      {
        description: 'pseudo array and equivalent array are not equal',
        value1: { '0': 0, '1': 1, length: 2 },
        value2: [0, 1],
        expected: false
      },
      {
        description: 'equal date objects',
        value1: new Date('2017-06-16T21:36:48.362Z'),
        value2: new Date('2017-06-16T21:36:48.362Z'),
        expected: true
      },
      {
        description: 'not equal date objects',
        value1: new Date('2017-06-16T21:36:48.362Z'),
        value2: new Date('2017-01-01T00:00:00.000Z'),
        expected: false
      },
      {
        description: 'date and string are not equal',
        value1: new Date('2017-06-16T21:36:48.362Z'),
        value2: '2017-06-16T21:36:48.362Z',
        expected: false
      },
      {
        description: 'date and object are not equal',
        value1: new Date('2017-06-16T21:36:48.362Z'),
        value2: {},
        expected: false
      },
      {
        description: 'equal numbers',
        value1: 1,
        value2: 1,
        expected: true
      },
      {
        description: 'not equal numbers',
        value1: 1,
        value2: 2,
        expected: false
      },
      {
        description: 'number and array are not equal',
        value1: 1,
        value2: [],
        expected: false
      },
      {
        description: '0 and null are not equal',
        value1: 0,
        value2: null,
        expected: false
      },
      {
        description: 'equal strings',
        value1: 'a',
        value2: 'a',
        expected: true
      },
      {
        description: 'not equal strings',
        value1: 'a',
        value2: 'b',
        expected: false
      },
      {
        description: 'empty string and null are not equal',
        value1: '',
        value2: null,
        expected: false
      },
      {
        description: 'null is equal to null',
        value1: null,
        value2: null,
        expected: true
      },
      {
        description: 'equal booleans (true)',
        value1: true,
        value2: true,
        expected: true
      },
      {
        description: 'equal booleans (false)',
        value1: false,
        value2: false,
        expected: true
      },
      {
        description: 'not equal booleans',
        value1: true,
        value2: false,
        expected: false
      },
      {
        description: '1 and true are not equal',
        value1: 1,
        value2: true,
        expected: false
      },
      {
        description: '0 and false are not equal',
        value1: 0,
        value2: false,
        expected: false
      },
      {
        description: 'NaN and NaN are equal',
        value1: NaN,
        value2: NaN,
        expected: true
      },
      {
        description: '0 and -0 are equal',
        value1: 0,
        value2: -0,
        expected: true
      },
      {
        description: 'Infinity and Infinity are equal',
        value1: Infinity,
        value2: Infinity,
        expected: true
      },
      {
        description: 'Infinity and -Infinity are not equal',
        value1: Infinity,
        value2: -Infinity,
        expected: false
      }
    ],
    ({ description, value1, value2, expected }) => {
      it(description, () => {
        assert.equal(isEqual(value1, value2), expected)
      })
    }
  )
})
