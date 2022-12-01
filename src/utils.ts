export const getPackageName = (path: string) => {
  const regexp =
    /([A-z]|\/|-|[0-9])+\/node_modules\/((?<namespace>(@([A-z]|-|[0-9])+))\/)?(?<packageName>([A-z]|-|[0-9])+)/
  const groups = path.match(regexp)?.groups ?? {}
  if (groups.namespace) {
    return `${groups.namespace}/${groups.packageName}`
  }
  return groups.packageName
}
