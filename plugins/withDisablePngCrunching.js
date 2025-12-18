const { withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

// Plugin to disable PNG crunching in Android builds
const withDisablePngCrunching = (config) => {
    config = withAppBuildGradle(config, (config) => {
        const buildGradle = config.modResults.contents;

        // Check if aaptOptions already exists
        if (!buildGradle.includes('aaptOptions')) {
            // Add aaptOptions block after android { block
            const androidBlockMatch = /android\s*\{/;
            if (androidBlockMatch.test(buildGradle)) {
                config.modResults.contents = buildGradle.replace(
                    androidBlockMatch,
                    `android {
    aaptOptions {
        cruncherEnabled = false
    }`
                );
            }
        }

        return config;
    });

    return config;
};

module.exports = withDisablePngCrunching;
