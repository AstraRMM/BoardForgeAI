import fs from 'node:fs'

const DEFAULT_JAVA = 'C:/Users/luifi/Desktop/FN-ESC1/tools/java/jdk-25.0.3+9-jre/bin/java.exe'
const DEFAULT_JAR = 'C:/Users/luifi/Desktop/FN-ESC1/tools/freerouting/freerouting-2.2.4.jar'

export function detectFreeRoutingBackend(options = {}) {
  const javaPath = options.javaPath || process.env.BOARDFORGE_JAVA || DEFAULT_JAVA
  const jarPath = options.freeroutingJar || process.env.BOARDFORGE_FREEROUTING_JAR || DEFAULT_JAR
  const javaFound = fs.existsSync(javaPath)
  const jarFound = fs.existsSync(jarPath)
  return {
    id: 'freerouting',
    name: 'FreeRouting',
    available: javaFound && jarFound,
    javaPath,
    jarPath,
    missing: [
      ...(!javaFound ? ['java_runtime'] : []),
      ...(!jarFound ? ['freerouting_jar'] : []),
    ],
    supports: ['dsn', 'ses'],
  }
}

export function buildFreeRoutingCommand({ dsnPath, sesPath, javaPath, jarPath } = {}) {
  return {
    command: javaPath || DEFAULT_JAVA,
    args: ['-jar', jarPath || DEFAULT_JAR, '-de', dsnPath, '-do', sesPath],
  }
}
