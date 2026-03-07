const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to disable PNG crunching in Android.
 * This is used to fix issues where certain image assets cause build failures during the 'crunching' process.
 */
module.exports = function withDisablePngCrunching(config) {
    return withAppBuildGradle(config, (config) => {
        if (config.modResults.language === 'groovy') {
            if (!config.modResults.contents.includes('cruncherEnabled = false')) {
                config.modResults.contents = config.modResults.contents.replace(
                    /android\s*{/,
                    `android {
    aaptOptions {
        cruncherEnabled = false
    }`
                );
            }
        }
        return config;
    });
};
