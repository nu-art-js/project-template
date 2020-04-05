export const config = {
	HttpModule: {
		// origin: "http://192.168.1.5:3000",
		origin: "http://localhost:5000/nu-art-thunderstorm/us-central1/api",
		timeout: 10000
	},
	frontend: {
		// origin: "http://192.168.1.5:3010",
		origin: "http://nu-art-thunderstorm.firebaseapp.com",
	},
	ExampleModule: {
		remoteUrl: "/v1/sample/endpoint-example"
	},
	ForceUpgrade:{
		assertVersionUrl: "/v1/version/assert"
	},
	LocalizationModule: {
		defaultLocale: "en",
		locales: {
			"en": {
				label: "Language_English",
				icon: "languages/en",
			},
			"nl": {
				label: "Language_Dutch",
				icon: "languages/nl"
			}
		},
		languages: {
			"en": require(`./res/localization/en`),
			"nl": require(`./res/localization/nl`),
		}
	}
};