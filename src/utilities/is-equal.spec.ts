import { assert } from 'chai'
import { forEach } from 'lodash-es'
import { isEqual } from './is-equal'

describe('arrays', () => {
  forEach(
    [
      {
        description: 'two empty arrays are equal',
        expected: true,
        value1: { a: 'asd', b: 'zxc' },
        value2: { a: 'asd', b: 'zxc' }
      },
      {
        description: 'two empty arrays are equal',
        expected: true,
        value1: [],
        value2: []
      },
      {
        description: 'equal arrays',
        expected: true,
        value1: [1, 2, 3],
        value2: [1, 2, 3]
      },
      {
        description: 'not equal arrays (different item)',
        expected: false,
        value1: [1, 2, 3],
        value2: [1, 2, 4]
      },
      {
        description: 'not equal arrays (different length)',
        expected: false,
        value1: [1, 2],
        value2: [1, 2, 3]
      },
      {
        description: 'not equal arrays (different length)',
        expected: false,
        value1: [1, 2, 3],
        value2: [1, 2]
      },
      {
        description: 'equal arrays of objects',
        expected: true,
        value1: [{ a: 'a' }, { b: 'b' }],
        value2: [{ a: 'a' }, { b: 'b' }]
      },
      {
        description: 'not equal arrays of objects',
        expected: false,
        value1: [{ a: 'a' }, { b: 'b' }],
        value2: [{ a: 'a' }, { b: 'c' }]
      },
      {
        description: 'pseudo array and equivalent array are not equal',
        expected: false,
        value1: { '0': 0, '1': 1, length: 2 },
        value2: [0, 1]
      },
      {
        description: 'two empty arrays are equal',
        expected: true,
        value1: [],
        value2: []
      },
      {
        description: 'equal arrays',
        expected: true,
        value1: [1, 2, 3],
        value2: [1, 2, 3]
      },
      {
        description: 'not equal arrays (different item)',
        expected: false,
        value1: [1, 2, 3],
        value2: [1, 2, 4]
      },
      {
        description: 'not equal arrays (different length)',
        expected: false,
        value1: [1, 2, 3],
        value2: [1, 2]
      },
      {
        description: 'equal arrays of objects',
        expected: true,
        value1: [{ a: 'a' }, { b: 'b' }],
        value2: [{ a: 'a' }, { b: 'b' }]
      },
      {
        description: 'not equal arrays of objects',
        expected: false,
        value1: [{ a: 'a' }, { b: 'b' }],
        value2: [{ a: 'a' }, { b: 'c' }]
      },
      {
        description: 'pseudo array and equivalent array are not equal',
        expected: false,
        value1: { '0': 0, '1': 1, length: 2 },
        value2: [0, 1]
      },
      {
        description: 'equal date objects',
        expected: true,
        value1: new Date('2017-06-16T21:36:48.362Z'),
        value2: new Date('2017-06-16T21:36:48.362Z')
      },
      {
        description: 'not equal date objects',
        expected: false,
        value1: new Date('2017-06-16T21:36:48.362Z'),
        value2: new Date('2017-01-01T00:00:00.000Z')
      },
      {
        description: 'date and string are not equal',
        expected: false,
        value1: new Date('2017-06-16T21:36:48.362Z'),
        value2: '2017-06-16T21:36:48.362Z'
      },
      {
        description: 'date and object are not equal',
        expected: false,
        value1: new Date('2017-06-16T21:36:48.362Z'),
        value2: {}
      },
      {
        description: 'equal numbers',
        expected: true,
        value1: 1,
        value2: 1
      },
      {
        description: 'not equal numbers',
        expected: false,
        value1: 1,
        value2: 2
      },
      {
        description: 'number and array are not equal',
        expected: false,
        value1: 1,
        value2: []
      },
      {
        description: '0 and null are not equal',
        expected: false,
        value1: 0,
        value2: null
      },
      {
        description: 'equal strings',
        expected: true,
        value1: 'a',
        value2: 'a'
      },
      {
        description: 'not equal strings',
        expected: false,
        value1: 'a',
        value2: 'b'
      },
      {
        description: 'empty string and null are not equal',
        expected: false,
        value1: '',
        value2: null
      },
      {
        description: 'null is equal to null',
        expected: true,
        value1: null,
        value2: null
      },
      {
        description: 'equal booleans (true)',
        expected: true,
        value1: true,
        value2: true
      },
      {
        description: 'equal booleans (false)',
        expected: true,
        value1: false,
        value2: false
      },
      {
        description: 'not equal booleans',
        expected: false,
        value1: true,
        value2: false
      },
      {
        description: '1 and true are not equal',
        expected: false,
        value1: 1,
        value2: true
      },
      {
        description: '0 and false are not equal',
        expected: false,
        value1: 0,
        value2: false
      },
      {
        description: 'NaN and NaN are equal',
        expected: true,
        value1: NaN,
        value2: NaN
      },
      {
        description: '0 and -0 are equal',
        expected: true,
        value1: 0,
        value2: -0
      },
      {
        description: 'Infinity and Infinity are equal',
        expected: true,
        value1: Infinity,
        value2: Infinity
      },
      {
        description: 'Infinity and -Infinity are not equal',
        expected: false,
        value1: Infinity,
        value2: -Infinity
      }
    ],
    ({ description, expected, value1, value2 }) => {
      it(description, () => {
        assert.equal(isEqual(value1, value2), expected)
      })
    }
  )
})
