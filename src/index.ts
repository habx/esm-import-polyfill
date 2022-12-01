import * as fs from 'fs'
import glob from 'glob'
import { importEsm } from 'tsimportlib'

import { getPackageName } from './utils'

export default async (callback: Function) => {
  // Used to pass reference of the module into the require function before it's loaded
  let esmOnlyPackages: Record<string, null | any> = {}

  // Retrieve all esm only modules
  await new Promise<void>((resolve, reject) =>
    glob('**/node_modules/**/package.json', async (err, files) => {
      if (err) {
        return reject(err)
      }
      files.forEach((file) => {
        try {
          const packageJson = JSON.parse(fs.readFileSync(file, 'utf8'))
          if (packageJson.type === 'module' && packageJson.name) {
            try {
              // test is require is really failing
              require(packageJson.name)
            } catch {
              // if it fails, add it to the list of esm only modules
              esmOnlyPackages[packageJson.name] = null
            }
          }
          // silent catch
        } catch {}  // eslint-disable-line no-empty
      })
      return resolve()
    })
  )

  // Add references to esm modules in require function
  Object.keys(require.extensions).forEach((ext) => {
    const initialExtensionRequire = require.extensions[ext]!
    require.extensions[ext] = (module, filename) => {
      try {
        initialExtensionRequire(module, filename)
      } catch (e) {
        if (e instanceof Error && 'code' in e && e.code === 'ERR_REQUIRE_ESM') {
          const packageName = getPackageName(filename)
          if (!packageName) {
            throw e
          }
          module.exports = esmOnlyPackages[packageName]
        } else {
          throw e
        }
      }
    }
  })

  // Preload esm modules
  await Promise.all(
    Object.keys(esmOnlyPackages).map(async (path) => {
      const importedModule = await importEsm(path, module)
      esmOnlyPackages[path] = importedModule.default
    })
  )

  callback()
}
