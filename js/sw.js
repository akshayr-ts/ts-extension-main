// Configuration management
const CONFIG_URL =
	"https://raw.githubusercontent.com/akshayr-ts/ts-extension-main/main/plugin-config.json"; // GitHub raw URL
const CONFIG_CACHE_KEY = "plugin_config";
const CONFIG_CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

async function loadConfiguration() {
	try {
		console.log("Service worker: Loading configuration...");

		// Check if chrome.storage is available
		if (!chrome.storage || !chrome.storage.local) {
			console.warn(
				"Service worker: chrome.storage.local not available, skipping cache"
			);
			return await fetchConfigurationDirectly();
		}

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
			console.log("Service worker: Using cached configuration");
			return cachedConfig[CONFIG_CACHE_KEY];
		}

		console.log(
			"Service worker: Fetching fresh configuration from",
			CONFIG_URL
		);
		const response = await fetch(CONFIG_URL);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const config = await response.json();
		console.log("Service worker: Successfully fetched config", config);

		// Try to cache, but don't fail if storage isn't available
		try {
			await chrome.storage.local.set({
				[CONFIG_CACHE_KEY]: config,
				config_cached_at: now,
			});
			console.log("Service worker: Configuration cached successfully");
		} catch (storageError) {
			console.warn("Service worker: Failed to cache config:", storageError);
		}

		return config;
	} catch (error) {
		console.error("Service worker: Failed to load configuration:", error);
		console.log("Service worker: Falling back to default configuration");
		return getDefaultConfiguration();
	}
}

function getDefaultConfiguration() {
	console.log("Service worker: Using default configuration");
	return {
		version: "1.0.0",
		allowed_organizations: ["org801559407"],
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
	console.log("Service worker: getConfiguration called");

	// Check if chrome.storage is available
	if (!chrome.storage || !chrome.storage.local) {
		console.warn(
			"Service worker: chrome.storage.local not available, loading fresh config"
		);
		return await loadConfiguration();
	}

	try {
		const cachedConfig = await chrome.storage.local.get(CONFIG_CACHE_KEY);
		if (cachedConfig[CONFIG_CACHE_KEY]) {
			console.log("Service worker: Returning cached config");
			return cachedConfig[CONFIG_CACHE_KEY];
		}
	} catch (storageError) {
		console.warn("Service worker: Error accessing storage:", storageError);
	}

	console.log("Service worker: No cached config, loading fresh");
	return await loadConfiguration();
}

// Function to clear configuration cache (useful for debugging)
async function clearConfigCache() {
	console.log("Service worker: Clearing config cache");

	// Check if chrome.storage is available
	if (!chrome.storage || !chrome.storage.local) {
		console.warn(
			"Service worker: chrome.storage.local not available, cannot clear cache"
		);
		return;
	}

	try {
		await chrome.storage.local.remove([CONFIG_CACHE_KEY, "config_cached_at"]);
		console.log("Service worker: Cache cleared successfully");
	} catch (error) {
		console.warn("Service worker: Error clearing cache:", error);
	}
}

chrome.runtime.onInstalled.addListener((details) => {
	console.log(
		"Service worker: Extension installed/updated, clearing cache and loading config"
	);
	clearConfigCache()
		.then(() => {
			return loadConfiguration();
		})
		.then(() => {
			registerDynamicRules();
		})
		.catch((error) => {
			console.error("Service worker: Error during installation setup:", error);
			// Still try to register rules even if config loading fails
			registerDynamicRules();
		});
});

// New startup listener
chrome.runtime.onStartup.addListener(() => {
	console.log("Service worker: Extension startup, loading configuration");
	loadConfiguration().catch((error) => {
		console.error("Service worker: Error loading config on startup:", error);
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
		console.log("Service worker: Received get_config request");
		getConfiguration()
			.then((config) => {
				console.log("Service worker: Successfully loaded config", config);
				sendResponse({ success: true, config: config });
			})
			.catch((error) => {
				console.error("Service worker: Error loading config", error);
				sendResponse({ success: false, error: error.message });
			});
		return true; // Keep the message channel open for async response
	}

	// Handle cache clearing requests
	if (request.action === "clear_config_cache") {
		console.log("Service worker: Received clear_config_cache request");
		clearConfigCache()
			.then(() => {
				sendResponse({ success: true });
			})
			.catch((error) => {
				console.error("Service worker: Error clearing cache", error);
				sendResponse({ success: false, error: error.message });
			});
		return true; // Keep the message channel open for async response
	}

	// Handle organization validation requests
	if (request.action === "validate_organization") {
		console.log(
			"Service worker: Received validate_organization request for",
			request.orgId
		);
		validateOrganization(request.orgId)
			.then((allowed) => {
				sendResponse({ success: true, allowed: allowed });
			})
			.catch((error) => {
				console.error("Service worker: Error validating organization", error);
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

// Function to fetch configuration directly without caching (fallback)
async function fetchConfigurationDirectly() {
	console.log("Service worker: Fetching configuration directly (no cache)");
	try {
		const response = await fetch(CONFIG_URL);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const config = await response.json();
		console.log("Service worker: Successfully fetched config directly", config);
		return config;
	} catch (error) {
		console.error("Service worker: Failed to fetch config directly:", error);
		return getDefaultConfiguration();
	}
}

// Function to validate organization access
async function validateOrganization(orgId) {
	try {
		console.log(`Service worker: Validating organization ${orgId}`);
		const config = await getConfiguration();

		if (
			config.allowed_organizations &&
			Array.isArray(config.allowed_organizations)
		) {
			const isAllowed = config.allowed_organizations.includes(orgId);
			console.log(
				`Service worker: Organization ${orgId} allowed: ${isAllowed}`
			);
			return isAllowed;
		}

		console.warn("Service worker: No allowed_organizations found in config");
		return false;
	} catch (error) {
		console.error("Service worker: Error validating organization:", error);
		return false;
	}
}
