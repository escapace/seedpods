import config from 'eslint-config-escapace'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  ...config,
  {
    rules: {
      '@typescript-eslint/no-non-null-assertion': 0,
      '@typescript-eslint/no-explicit-any': 0
    }
  }
)
