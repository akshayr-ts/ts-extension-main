// Configuration management
const CONFIG_URL =
	"https://raw.githubusercontent.com/your-username/your-repo/main/plugin-config.json"; // Replace with your config URL
const CONFIG_CACHE_KEY = "plugin_config";
const CONFIG_CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

async function loadConfiguration() {
	try {
		const cachedConfig = await chrome.storage.local.get([
			CONFIG_CACHE_KEY,
			"config_cached_at",
		]);
		const now = Date.now();

		if (
			cachedConfig[CONFIG_CACHE_KEY] &&
			cachedConfig.config_cached_at &&
			now - cachedConfig.config_cached_at < CONFIG_CACHE_DURATION
		) {
			return cachedConfig[CONFIG_CACHE_KEY];
		}

		const response = await fetch(CONFIG_URL);
		const config = await response.json();

		await chrome.storage.local.set({
			[CONFIG_CACHE_KEY]: config,
			config_cached_at: now,
		});

		return config;
	} catch (error) {
		console.error("Failed to load configuration:", error);
		return getDefaultConfiguration();
	}
}

function getDefaultConfiguration() {
	return {
		version: "1.0.0",
		zoho_config: {
			base_urls: ["https://recruit.zoho.com"],
			url_patterns: [
				"https://recruit.zoho.com/recruit/*/ShowDetails.do*",
				"https://recruit.zoho.com/recruit/*/ShowEntityInfo.do*",
				"https://recruit.zoho.com/recruit/*/EditCommonModule.do?module=Leads",
			],
		},
		dropdown_values: {
			job_openings: [],
			default_selection: null,
		},
		pipeline_stages: [],
		auto_applications: {
			enabled: true,
			retry_interval: 500,
			max_wait_time: 10000,
			debug: false,
		},
	};
}

async function getConfiguration() {
	const cachedConfig = await chrome.storage.local.get(CONFIG_CACHE_KEY);
	if (cachedConfig[CONFIG_CACHE_KEY]) {
		return cachedConfig[CONFIG_CACHE_KEY];
	}
	return await loadConfiguration();
}

chrome.runtime.onInstalled.addListener((details) => {
	loadConfiguration().then(() => {
		registerDynamicRules();
	});
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === "init-select2") {
		chrome.scripting.executeScript({
			target: { tabId: sender.tab.id },
			world: "MAIN",
			args: [request.selector],
			func: (selector) => {
				$(selector).select2({
					placeholder: "Select a job",
					width: "style",
				});
			},
		});
	}

	// Handle configuration requests
	if (request.action === "get_config") {
		getConfiguration()
			.then((config) => {
				sendResponse({ success: true, config: config });
			})
			.catch((error) => {
				sendResponse({ success: false, error: error.message });
			});
		return true; // Keep the message channel open for async response
	}

	// Handle dropdown values request
	if (request.action === "get_dropdown_values") {
		getConfiguration()
			.then((config) => {
				sendResponse({
					success: true,
					values: config.dropdown_values.job_openings,
					default_selection: config.dropdown_values.default_selection,
				});
			})
			.catch((error) => {
				sendResponse({ success: false, error: error.message });
			});
		return true;
	}
});

chrome.webRequest.onCompleted.addListener(
	(details) => {
		if (details.frameType == "outermost_frame") {
			chrome.tabs.sendMessage(details.tabId, {
				status: "request-completed",
				url: details.url,
			});
		} else if (details.frameType == "sub_frame") {
			chrome.tabs.sendMessage(
				details.tabId,
				{
					status: "request-completed",
					url: details.url,
				},
				{ frameId: details.frameId }
			);
		}
	},
	{
		types: ["xmlhttprequest"],
		urls: [
			"https://recruit.zoho.com/recruit/*/ShowDetails.do*",
			"https://recruit.zoho.com/recruit/*/ShowEntityInfo.do*",
			"https://recruit.zoho.com/recruit/*/EditCommonModule.do?module=Leads",
		],
	}
);

async function registerDynamicRules() {
	// Load configuration first
	const config = await getConfiguration();

	let rules = await chrome.declarativeNetRequest.getDynamicRules();
	let removeRuleIds = rules.map((r) => r.id);

	let addRules = [
		{
			id: 1,
			priority: 1,
			condition: {
				urlFilter: "||recruit.zoho.com",
				resourceTypes: ["main_frame", "sub_frame"],
			},
			action: {
				type: "modifyHeaders",
				responseHeaders: [
					{
						header: "X-Frame-Options",
						operation: "remove",
					},
					{
						header: "x-frame-options",
						operation: "remove",
					},
				],
			},
		},
	];

	chrome.declarativeNetRequest.updateDynamicRules({ addRules, removeRuleIds });
}
