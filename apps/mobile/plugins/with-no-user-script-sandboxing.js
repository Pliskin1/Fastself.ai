const { withXcodeProject } = require('expo/config-plugins');

module.exports = function withNoUserScriptSandboxing(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const targetName = cfg.modRequest.projectName;
    const section = project.pbxXCBuildConfigurationSection();
    const nativeTarget = project.pbxTargetByName(targetName);
    const configListId = nativeTarget?.buildConfigurationList;
    const configList = project.pbxXCConfigurationList()[configListId];
    const ids = new Set((configList?.buildConfigurations ?? []).map((c) => c.value));

    for (const [id, entry] of Object.entries(section)) {
      if (typeof entry === 'object' && ids.has(id)) {
        entry.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
      }
    }
    return cfg;
  });
};
