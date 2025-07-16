// Dynamic stage buttons - will be populated from pipeline configuration
let stageButtons = [];

// Primary pipeline configuration - matches your actual Zoho Recruit pipeline
// This is comprehensive and includes all statuses from your pipeline setup
const fallbackStageButtons = [
	{
		label: "Applied",
		short: "APL",
		value: "Applied",
		background: "#a54444",
		badgeClass: "apple-blossom",
	},
	{
		label: "AI Database",
		short: "AID",
		value: "AI Database",
		background: "#a54444",
		badgeClass: "apple-blossom",
	},
	{
		label: "AI Linkedin",
		short: "AIL",
		value: "AI Linkedin",
		background: "#a54444",
		badgeClass: "apple-blossom",
	},
	{
		label: "ShortList",
		short: "SL",
		value: "ShortList",
		background: "#d0a72b",
		badgeClass: "sheen-gold",
	},
	{
		label: "Booked",
		short: "BKD",
		value: "Booked",
		background: "#1a936a",
		badgeClass: "lightgreen",
	},
	{
		label: "Spoken-to",
		short: "ST",
		value: "Spoken-to",
		background: "#1e3a8a",
		badgeClass: "darkblue",
	},
	{
		label: "Chase VI",
		short: "CVI",
		value: "Chase VI",
		background: "#1e3a8a",
		badgeClass: "darkblue",
	},
	{
		label: "Submitted",
		short: "SBMT",
		value: "Submitted",
		background: "#00868c",
		badgeClass: "darkgreen",
	},
	{
		label: "Hired",
		short: "HRD",
		value: "Hired",
		background: "#1a936a",
		badgeClass: "lightgreen",
	},
	{
		label: "Rejected",
		short: "RJD",
		value: "Rejected",
		background: "#ed0707",
		badgeClass: "red",
	},
	{
		label: "Rejected by client",
		short: "RJC",
		value: "Rejected by client",
		background: "#ed0707",
		badgeClass: "red",
	},
	{
		label: "Archived",
		short: "ARC",
		value: "Archived",
		background: "#6b7280",
		badgeClass: "cadet",
	},
];

// Color mapping for stage themes
const stageColorMap = {
	"apple-blossom": "#a54444",
	"sheen-gold": "#d0a72b",
	darkgreen: "#00868c",
	darkblue: "#1e3a8a",
	"birdflower-green": "#CCD118",
	lightgreen: "#1a936a",
	red: "#ed0707",
	yellow: "#f59e0b",
	cadet: "#6b7280",
};

// Function to load pipeline configuration and populate stageButtons
async function loadPipelineConfiguration() {
	try {
		console.log("Content script: Starting pipeline configuration load...");

		// Check if we're on the pipeline configuration page
		const pipelineContainer = document.querySelector("#pp-main-div");
		if (pipelineContainer) {
			console.log(
				"Content script: Loading pipeline configuration from current page..."
			);
			populateStageButtonsFromPipeline(pipelineContainer);
			return;
		}

		// Try to load stage buttons from centralized configuration first
		console.log(
			"Content script: Attempting to load pipeline configuration from centralized config..."
		);
		const configLoaded = await loadStageButtonsFromConfig();

		// If no stage buttons loaded from config, use fallback
		if (!configLoaded || stageButtons.length === 0) {
			console.log(
				"Content script: No pipeline config found or failed to load, using comprehensive fallback pipeline configuration"
			);
			stageButtons = [...fallbackStageButtons];
			console.log(
				`Content script: Using ${stageButtons.length} fallback stage buttons`
			);
		} else {
			console.log(
				`Content script: Successfully loaded ${stageButtons.length} stage buttons from config`
			);
		}

		// Optional: Try to fetch pipeline configuration in the background (non-blocking)
		// This can be enabled later when authentication issues are resolved
		// fetchPipelineConfiguration();
	} catch (error) {
		console.error(
			"Content script: Error loading pipeline configuration:",
			error
		);
		console.log("Content script: Falling back to hardcoded configuration");
		stageButtons = [...fallbackStageButtons];
	}
}

// Function to populate stageButtons from pipeline DOM
function populateStageButtonsFromPipeline(pipelineContainer) {
	const newStageButtons = [];

	console.log("Pipeline container found:", pipelineContainer);

	// Get all stage containers
	const stageContainers =
		pipelineContainer.querySelectorAll("dl.sp-reorder-list");

	console.log("Found", stageContainers.length, "stage containers");

	stageContainers.forEach((stageContainer, index) => {
		console.log(`Processing stage ${index + 1}:`, stageContainer);

		const stageDetailsInput = stageContainer.querySelector(".stage-details-td");
		if (!stageDetailsInput) {
			console.log(`No stage details found for stage ${index + 1}`);
			return;
		}

		const stageName = stageDetailsInput.dataset.stagename;
		const stageColor = stageDetailsInput.dataset.stagecolor;

		console.log(
			`Stage ${index + 1}: name="${stageName}", color="${stageColor}"`
		);

		// Get all status values under this stage
		const statusElements = stageContainer.querySelectorAll(".status-value");

		console.log(
			`Found ${statusElements.length} status elements in stage "${stageName}"`
		);

		statusElements.forEach((statusElement) => {
			const statusValue = statusElement.getAttribute("value");
			const statusText = statusElement.textContent.trim();

			console.log(`Status: value="${statusValue}", text="${statusText}"`);

			if (statusValue && statusText) {
				// Generate short form (first 3-4 characters or abbreviation)
				const shortForm = generateShortForm(statusText);

				// Get background color from stage color
				const background = stageColorMap[stageColor] || "#6b7280";

				const buttonConfig = {
					label: statusText,
					short: shortForm,
					value: statusValue,
					background: background,
					badgeClass: stageColor,
					stageName: stageName,
				};

				console.log("Adding button config:", buttonConfig);
				newStageButtons.push(buttonConfig);
			}
		});
	});

	console.log("Total buttons found:", newStageButtons.length);
	console.log("Button configurations:", newStageButtons);

	if (newStageButtons.length > 0) {
		stageButtons = newStageButtons;
		console.log(
			"Loaded",
			stageButtons.length,
			"status options from pipeline configuration"
		);
	} else {
		console.log("No statuses found in pipeline, using fallback configuration");
		stageButtons = [...fallbackStageButtons];
	}
}

// Function to generate short form for status names
function generateShortForm(statusText) {
	// Handle common abbreviations
	const abbreviations = {
		Applied: "APL",
		ShortList: "SL",
		Submitted: "SBMT",
		"Spoken-to": "ST",
		"Chase VI": "CVI",
		Booked: "BKD",
		Interview: "INT",
		Hired: "HRD",
		Rejected: "RJD",
		"Rejected by client": "RJC",
		Archived: "ARC",
		"AI Database": "AID",
		"AI Linkedin": "AIL",
	};

	// Return predefined abbreviation or generate one
	if (abbreviations[statusText]) {
		return abbreviations[statusText];
	}

	// Generate abbreviation from first letters or first 3-4 chars
	if (statusText.includes(" ")) {
		return statusText
			.split(" ")
			.map((word) => word.charAt(0))
			.join("")
			.toUpperCase();
	} else {
		return statusText.substring(0, 3).toUpperCase();
	}
}

// Function to fetch pipeline configuration from server
async function fetchPipelineConfiguration() {
	try {
		let [orgId] = location.pathname.match(/(?<=\/org)[0-9]+(?=\/)/i) ?? [];

		const url = `${location.origin}/recruit/org${orgId}/ShowSetup.do?tab=customize&subTab=hp`;

		// First try the direct fetch approach
		console.log("Attempting to fetch pipeline configuration from:", url);
		const response = await fetch(url);

		if (response.ok) {
			const html = await response.text();
			console.log("Fetched HTML length:", html.length);
			console.log(
				"HTML contains setupPipeline:",
				html.includes("setupPipeline")
			);
			console.log("HTML contains pp-main-div:", html.includes("pp-main-div"));

			const parser = new DOMParser();
			const doc = parser.parseFromString(html, "text/html");

			// Debug: Check what we actually got
			const setupPipeline = doc.querySelector("#setupPipeline");
			console.log("setupPipeline element found:", setupPipeline);

			const pipelineContainer = doc.querySelector("#pp-main-div");
			console.log("pp-main-div element found:", pipelineContainer);

			if (pipelineContainer) {
				console.log(
					"Pipeline container innerHTML length:",
					pipelineContainer.innerHTML.length
				);
				console.log(
					"Stage containers found:",
					pipelineContainer.querySelectorAll("dl.sp-reorder-list").length
				);
			}

			if (
				pipelineContainer &&
				pipelineContainer.querySelectorAll("dl.sp-reorder-list").length > 0
			) {
				console.log("Fetched pipeline configuration from server");
				populateStageButtonsFromPipeline(pipelineContainer);
				return;
			}
		}

		// If direct fetch didn't work, try iframe approach
		console.log("Direct fetch didn't work, trying iframe approach...");
		await fetchPipelineConfigurationViaIframe(url);
	} catch (error) {
		console.error("Error fetching pipeline configuration:", error);
		stageButtons = [...fallbackStageButtons];
	}
}

// Alternative approach using iframe to load the page and execute JavaScript
async function fetchPipelineConfigurationViaIframe(url) {
	return new Promise((resolve) => {
		console.log("Creating iframe to load pipeline configuration...");

		// Create a hidden iframe
		const iframe = document.createElement("iframe");
		iframe.style.display = "none";
		iframe.style.position = "absolute";
		iframe.style.left = "-9999px";
		iframe.style.width = "1px";
		iframe.style.height = "1px";

		let timeoutId;
		let resolved = false;

		iframe.onload = function () {
			console.log("Iframe loaded, checking for pipeline data...");

			// Wait a bit for JavaScript to execute
			setTimeout(() => {
				try {
					const iframeDoc =
						iframe.contentDocument || iframe.contentWindow.document;
					const pipelineContainer = iframeDoc.querySelector("#pp-main-div");

					console.log("Iframe pp-main-div found:", !!pipelineContainer);
					if (pipelineContainer) {
						console.log(
							"Iframe stage containers found:",
							pipelineContainer.querySelectorAll("dl.sp-reorder-list").length
						);
					}

					if (
						pipelineContainer &&
						pipelineContainer.querySelectorAll("dl.sp-reorder-list").length > 0
					) {
						console.log(
							"Successfully loaded pipeline configuration via iframe"
						);
						populateStageButtonsFromPipeline(pipelineContainer);
					} else {
						console.log("Pipeline data not found in iframe, using fallback");
						stageButtons = [...fallbackStageButtons];
					}
				} catch (error) {
					console.error("Error accessing iframe content:", error);
					stageButtons = [...fallbackStageButtons];
				}

				// Clean up
				if (!resolved) {
					resolved = true;
					clearTimeout(timeoutId);
					document.body.removeChild(iframe);
					resolve();
				}
			}, 3000); // Wait 3 seconds for the page to fully load
		};

		iframe.onerror = function () {
			console.error("Failed to load iframe");
			if (!resolved) {
				resolved = true;
				clearTimeout(timeoutId);
				stageButtons = [...fallbackStageButtons];
				document.body.removeChild(iframe);
				resolve();
			}
		};

		// Timeout fallback
		timeoutId = setTimeout(() => {
			if (!resolved) {
				resolved = true;
				console.log("Iframe timeout, using fallback configuration");
				stageButtons = [...fallbackStageButtons];
				document.body.removeChild(iframe);
				resolve();
			}
		}, 10000); // 10 second timeout

		// Add iframe to DOM and load the URL
		document.body.appendChild(iframe);
		iframe.src = url;
	});
}

// Function to load stage buttons from centralized configuration
async function loadStageButtonsFromConfig() {
	try {
		console.log(
			"Content script: Sending get_config request to service worker..."
		);
		const response = await chrome.runtime.sendMessage({
			action: "get_config",
		});

		console.log(
			"Content script: Received response from service worker:",
			response
		);

		if (response && response.success && response.config) {
			console.log("Content script: Config received successfully");
			console.log(
				"Content script: Config structure:",
				JSON.stringify(response.config, null, 2)
			);

			if (
				response.config.pipeline_stages &&
				Array.isArray(response.config.pipeline_stages)
			) {
				console.log(
					"Content script: Loading stage buttons from centralized configuration"
				);
				console.log(
					"Content script: Pipeline stages found:",
					response.config.pipeline_stages
				);
				stageButtons = [...response.config.pipeline_stages];
				console.log(
					`Content script: Loaded ${stageButtons.length} stage buttons from configuration`
				);
				return true;
			} else {
				console.log(
					"Content script: No pipeline_stages array found in configuration"
				);
				console.log(
					"Content script: Available config keys:",
					Object.keys(response.config)
				);
				return false;
			}
		} else {
			console.log("Content script: Failed to get valid config response");
			console.log("Content script: Response details:", response);
			return false;
		}
	} catch (error) {
		console.error(
			"Content script: Error loading stage buttons from configuration:",
			error
		);
		return false;
	}
}

const jobs = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.status === "request-completed") {
		onRequestCompleted(request);
	}
});

addEventListener("load", (e) => {
	const target = document.querySelector("#candQuickView");

	let observer = new MutationObserver(onQuickViewUpdated);
	observer.observe(target, { childList: true, subtree: true });

	// Load pipeline configuration on page load
	setTimeout(loadPipelineConfiguration, 1000);
});

function onRequestCompleted(request) {
	const url = new URL(request.url);
	const action = url.pathname.split("/").pop();

	const params = Object.fromEntries(url.searchParams);
	const { module, submodule } = params;

	if (action === "ShowDetails.do") {
		if (module === "Leads") {
			if (submodule === "Leads") {
				fetchJobOpenings();
			} else if (submodule === "Applications") {
				updateApplicationsTable();
			}
		}
	} else if (action === "ShowEntityInfo.do") {
		if (module === "Leads") {
			if (submodule === "Leads") {
				updateLeadDetailsPage(submodule, params.entityId);
			} else if (submodule === "Applications") {
				updateLeadDetailsPage(submodule, params.id);
			}
		}
	}
}

function onQuickViewUpdated(mutations) {
	for (const mutation of mutations) {
		for (const addedNode of mutation.addedNodes) {
			if (addedNode.nodeType !== Node.ELEMENT_NODE) continue;

			if (addedNode.matches("#qv-main-container")) {
				let params = JSON.parse(addedNode.dataset.params);

				injectQuickViewCandidateTab(params);

				if (params.module == "Applications") {
					setTimeout(injectQuickViewStageButtons, 1000, addedNode, params);
				} else if (params.module == "Leads") {
					setTimeout(injectQuickViewAssociateJob, 1000, addedNode, params);
				}
			} else if (addedNode.matches("#candInnerQV")) {
				let container = addedNode.querySelector("#qv-main-container");
				let params = JSON.parse(container.dataset.params);

				injectQuickViewCandidateTab(params);

				if (params.module == "Applications") {
					setTimeout(injectQuickViewStageButtons, 1000, container, params);
				} else if (params.module == "Leads") {
					setTimeout(injectQuickViewAssociateJob, 1000, container, params);
				}
			}
		}
	}
}

function updateApplicationsTable() {
	let rows = document.querySelectorAll("table#listViewTable tbody tr");

	// Ensure pipeline configuration is loaded
	if (stageButtons.length === 0) {
		setTimeout(updateApplicationsTable, 500);
		return;
	}

	for (const row of rows) {
		try {
			let params = JSON.parse(row.dataset.params);

			injectTableViewCandidateButton(row, params);
			injectTableViewStageButtons(row, params);
		} catch (error) {
			console.error(error);
			notify(error.message, "error");
		}
	}
}

function injectTableViewCandidateButton(row, params) {
	try {
		const iconUrl = chrome.runtime.getURL("icons/visible.png");
		let [orgId] = location.pathname.match(/(?<=\/org)[0-9]+(?=\/)/i) ?? [];

		let td = row.querySelector("td");

		let url = `${location.origin}/recruit/org${orgId}/EntityInfo.do?module=Candidates&submodule=Candidates&id=${params.candId}&entityId=${row.id}`;

		let div = document.createElement("div");
		div.setAttribute("align", "center");
		div.classList.add("wid30");

		td.insertAdjacentElement("beforeend", div);

		let anchor = document.createElement("a");
		anchor.setAttribute("href", url);
		anchor.setAttribute("target", "_blank");
		anchor.setAttribute("onmouseover", "zctt.showtt('View this Candidate')");
		anchor.setAttribute("onmouseout", "zctt.hidett()");
		anchor.innerHTML = `<img src="${iconUrl}" style="width: 20px; height: 20px;">`;
		div.appendChild(anchor);
	} catch (error) {
		console.error(error);
		notify(error.message, "error");
	}
}

function injectTableViewStageButtons(row) {
	try {
		let nameTd = row.querySelector("td:nth-child(6)");

		let div = document.createElement("div");
		div.style =
			"display: flex; margin-top: 18px; gap: 5px; position: relative; z-index: 1001;";

		nameTd.insertAdjacentElement("beforeend", div);

		// Get current status from the row
		let currentStatus = getCurrentStatusFromRow(row);

		let select = document.createElement("select");
		select.dataset.entityId = row.id;
		select.className = "status-dropdown";
		select.style =
			"font-size: 12px; padding: 3px 8px; border-radius: 5px; border: 1px solid #ccc; background: white; cursor: pointer; position: relative; z-index: 1001 !important;";
		select.setAttribute("onmouseover", `zctt.showtt('Change status')`);
		select.setAttribute("onmouseout", "zctt.hidett()");

		// Prevent event propagation on dropdown interactions
		select.addEventListener("mousedown", (e) => {
			e.stopPropagation();
		});
		select.addEventListener("click", (e) => {
			e.stopPropagation();
		});
		select.addEventListener("focus", (e) => {
			e.stopPropagation();
		});

		// Add default option
		let defaultOption = document.createElement("option");
		defaultOption.value = "";
		defaultOption.innerText = currentStatus || "NA";
		defaultOption.disabled = true;
		select.appendChild(defaultOption);

		for (const stageButton of stageButtons) {
			let option = document.createElement("option");
			option.value = stageButton.value;
			option.innerText = stageButton.label;
			option.dataset.background = stageButton.background;
			option.dataset.badgeClass = stageButton.badgeClass;
			if (currentStatus === stageButton.value) {
				select.selectedIndex = 0;
				defaultOption.innerText = stageButton.label;
				defaultOption.style.background = stageButton.background;
				defaultOption.style.color = "white";
				select.style.background = stageButton.background;
				select.style.color = "white";
			}
			select.appendChild(option);
		}

		select.addEventListener("change", onTableViewStageDropdownChange);
		div.appendChild(select);
	} catch (error) {
		console.error(error);
		notify(error.message, "error");
	}
}

function onTableViewStageDropdownChange(e) {
	e.preventDefault();
	e.stopPropagation();
	e.stopImmediatePropagation();

	let select = this;
	let selectedOption = select.options[select.selectedIndex];
	let newStatus = selectedOption.value;
	let background = selectedOption.dataset.background;

	if (!newStatus) return;

	// Prevent any parent handlers from triggering
	setTimeout(() => {
		updateStatus(select.dataset.entityId, newStatus, (updatedStatus) => {
			notify(`Status updated to: ${updatedStatus}`);

			// Update the select appearance
			let defaultOption = select.options[0];
			defaultOption.innerText = selectedOption.innerText;
			defaultOption.style.background = background;
			defaultOption.style.color = "white";
			select.style.background = background;
			select.style.color = "white";
			select.selectedIndex = 0;
		});
	}, 0);
}

function getCurrentStatusFromRow(row) {
	try {
		// Try to find status in various ways
		// Look for status badge or text in the row
		let statusElement = row.querySelector(".nedit-status");
		if (statusElement) {
			return statusElement.innerText.trim();
		}

		// Look for hidden input with status
		let hiddenInput = row.querySelector(
			'input[id*="Status"], input[name*="status"]'
		);
		if (hiddenInput) {
			return hiddenInput.value;
		}

		// Look for any element with status classes
		for (const stageButton of stageButtons) {
			let statusElem = row.querySelector(`.${stageButton.badgeClass}`);
			if (statusElem) {
				return stageButton.value;
			}
		}

		// Look for status in data attributes
		if (row.dataset.status) {
			return row.dataset.status;
		}

		// Look for status in any span with status-related classes
		let statusSpan = row.querySelector('span[class*="status"]');
		if (statusSpan) {
			let statusText = statusSpan.innerText.trim();
			// Match against known status values
			for (const stageButton of stageButtons) {
				if (
					statusText.includes(stageButton.value) ||
					statusText.includes(stageButton.label)
				) {
					return stageButton.value;
				}
			}
		}

		return null;
	} catch (error) {
		console.error("Error getting current status:", error);
		return null;
	}
}

function updateLeadDetailsPage(submodule, entityId) {
	// Ensure pipeline configuration is loaded
	if (stageButtons.length === 0) {
		setTimeout(() => updateLeadDetailsPage(submodule, entityId), 500);
		return;
	}

	try {
		let target = document.querySelector(".detail-header-box");

		let div = document.createElement("div");
		div.style =
			"display: inline-flex; gap: 5px; margin-left: 5px; vertical-align: text-bottom; position: relative; z-index: 1001;";

		target.insertAdjacentElement("beforeend", div);

		// Get current status from the page
		let currentStatus = getCurrentStatusFromDetailPage();

		let select = document.createElement("select");
		select.dataset.submodule = submodule;
		select.dataset.entityId = entityId;
		select.className = "status-dropdown";
		select.style =
			"font-size: 12px; padding: 3px 8px; border-radius: 5px; border: 1px solid #ccc; background: white; cursor: pointer; position: relative; z-index: 1001 !important;";
		select.setAttribute("onmouseover", `zctt.showtt('Change status')`);
		select.setAttribute("onmouseout", "zctt.hidett()");

		// Prevent event propagation on dropdown interactions
		select.addEventListener("mousedown", (e) => {
			e.stopPropagation();
		});
		select.addEventListener("click", (e) => {
			e.stopPropagation();
		});
		select.addEventListener("focus", (e) => {
			e.stopPropagation();
		});

		// Add default option
		let defaultOption = document.createElement("option");
		defaultOption.value = "";
		defaultOption.innerText = currentStatus || "NA";
		defaultOption.disabled = true;
		select.appendChild(defaultOption);

		for (const stageButton of stageButtons) {
			let option = document.createElement("option");
			option.value = stageButton.value;
			option.innerText = stageButton.label;
			option.dataset.background = stageButton.background;
			option.dataset.badgeClass = stageButton.badgeClass;
			if (currentStatus === stageButton.value) {
				select.selectedIndex = 0;
				defaultOption.innerText = stageButton.label;
				defaultOption.style.background = stageButton.background;
				defaultOption.style.color = "white";
				select.style.background = stageButton.background;
				select.style.color = "white";
			}
			select.appendChild(option);
		}

		select.addEventListener("change", onLeadDetailStageDropdownChange);
		div.appendChild(select);
	} catch (error) {
		notify(error.message, "error");
	}
}

function onLeadDetailStageDropdownChange(e) {
	if (e) {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
	}

	let select = this;
	let selectedOption = select.options[select.selectedIndex];
	let newStatus = selectedOption.value;
	let background = selectedOption.dataset.background;
	let badgeClass = selectedOption.dataset.badgeClass;
	let submodule = select.dataset.submodule;

	if (!newStatus) return;

	// Prevent any parent handlers from triggering
	setTimeout(() => {
		updateStatus(select.dataset.entityId, newStatus, (updatedStatus) => {
			notify(`Status updated to: ${updatedStatus}`);

			// Update the select appearance
			let defaultOption = select.options[0];
			defaultOption.innerText = selectedOption.innerText;
			defaultOption.style.background = background;
			defaultOption.style.color = "white";
			select.style.background = background;
			select.style.color = "white";
			select.selectedIndex = 0;

			if (submodule === "Applications") {
				let badge = document.querySelector(".cand-status-value .nedit-status");
				if (badge) {
					for (const stageButton of stageButtons) {
						badge.classList.remove(stageButton.badgeClass);
					}

					badge.classList.add(badgeClass);
					badge.innerText = updatedStatus;
					badge.setAttribute("onmouseover", `Utils.showtt('${updatedStatus}')`);
				}
			}
		});
	}, 0);
}

function getCurrentStatusFromDetailPage() {
	try {
		// Look for status in the candidate status bar (based on your provided HTML)
		let statusElement = document.querySelector(
			".cand-status-value .nedit-status"
		);
		if (statusElement) {
			return statusElement.innerText.trim();
		}

		// Look for hidden input with status
		let hiddenInput = document.querySelector("#entityStatus");
		if (hiddenInput) {
			return hiddenInput.value;
		}

		// Look for status in header status area
		let headerStatus = document.querySelector(
			"#header_STATUS .cand-status-value .nedit-status"
		);
		if (headerStatus) {
			return headerStatus.innerText.trim();
		}

		// Look for any element with status classes
		for (const stageButton of stageButtons) {
			let statusElem = document.querySelector(`.${stageButton.badgeClass}`);
			if (statusElem) {
				return stageButton.value;
			}
		}

		// Look for status in any span with status-related classes
		let statusSpan = document.querySelector('span[class*="status"]');
		if (statusSpan) {
			let statusText = statusSpan.innerText.trim();
			// Match against known status values
			for (const stageButton of stageButtons) {
				if (
					statusText.includes(stageButton.value) ||
					statusText.includes(stageButton.label)
				) {
					return stageButton.value;
				}
			}
		}

		return null;
	} catch (error) {
		console.error("Error getting current status:", error);
		return null;
	}
}

function injectQuickViewStageButtons(container, params) {
	// Ensure pipeline configuration is loaded
	if (stageButtons.length === 0) {
		setTimeout(() => injectQuickViewStageButtons(container, params), 500);
		return;
	}

	try {
		let target = container.querySelector("#social-icons");

		let div = document.createElement("div");
		div.style =
			"display: inline-flex; gap: 5px; padding-left: 10px; position: relative; z-index: 1001;";

		target.insertAdjacentElement("beforeend", div);

		// Get current status from the quick view
		let currentStatus = getCurrentStatusFromQuickView(container);

		let select = document.createElement("select");
		select.dataset.entityId = params.id;
		select.className = "status-dropdown";
		select.style =
			"font-size: 12px; padding: 3px 8px; border-radius: 5px; border: 1px solid #ccc; background: white; cursor: pointer; position: relative; z-index: 1001 !important;";
		select.setAttribute("onmouseover", `zctt.showtt('Change status')`);
		select.setAttribute("onmouseout", "zctt.hidett()");

		// Prevent event propagation on dropdown interactions
		select.addEventListener("mousedown", (e) => {
			e.stopPropagation();
		});
		select.addEventListener("click", (e) => {
			e.stopPropagation();
		});
		select.addEventListener("focus", (e) => {
			e.stopPropagation();
		});

		// Add default option
		let defaultOption = document.createElement("option");
		defaultOption.value = "";
		defaultOption.innerText = currentStatus || "NA";
		defaultOption.disabled = true;
		select.appendChild(defaultOption);

		for (const stageButton of stageButtons) {
			let option = document.createElement("option");
			option.value = stageButton.value;
			option.innerText = stageButton.label;
			option.dataset.background = stageButton.background;
			option.dataset.badgeClass = stageButton.badgeClass;
			if (currentStatus === stageButton.value) {
				select.selectedIndex = 0;
				defaultOption.innerText = stageButton.label;
				defaultOption.style.background = stageButton.background;
				defaultOption.style.color = "white";
				select.style.background = stageButton.background;
				select.style.color = "white";
			}
			select.appendChild(option);
		}

		select.addEventListener("change", onQuickViewStageDropdownChange);
		div.appendChild(select);
	} catch (error) {
		console.error(error);
		notify(error.message, "error");
	}
}

function onQuickViewStageDropdownChange(e) {
	if (e) {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
	}

	let select = this;
	let selectedOption = select.options[select.selectedIndex];
	let newStatus = selectedOption.value;
	let background = selectedOption.dataset.background;
	let badgeClass = selectedOption.dataset.badgeClass;

	if (!newStatus) return;

	// Prevent any parent handlers from triggering
	setTimeout(() => {
		updateStatus(select.dataset.entityId, newStatus, (updatedStatus) => {
			// Update the select appearance
			let defaultOption = select.options[0];
			defaultOption.innerText = selectedOption.innerText;
			defaultOption.style.background = background;
			defaultOption.style.color = "white";
			select.style.background = background;
			select.style.color = "white";
			select.selectedIndex = 0;

			let badge = document.querySelector("#qv-main-container #qvStatusArea");
			if (badge) {
				for (const stageButton of stageButtons) {
					badge.classList.remove(stageButton.badgeClass);
				}

				badge.classList.add(badgeClass);
				badge.innerText = updatedStatus;
			}

			notify(`Status updated to: ${updatedStatus}`);
		});
	}, 0);
}

function getCurrentStatusFromQuickView(container) {
	try {
		// Look for status in the quick view status area
		let statusElement = container.querySelector("#qvStatusArea");
		if (statusElement) {
			return statusElement.innerText.trim();
		}

		// Look for status in any nested elements
		let statusSpan = container.querySelector('span[class*="status"]');
		if (statusSpan) {
			let statusText = statusSpan.innerText.trim();
			// Match against known status values
			for (const stageButton of stageButtons) {
				if (
					statusText.includes(stageButton.value) ||
					statusText.includes(stageButton.label)
				) {
					return stageButton.value;
				}
			}
		}

		// Look for any element with status classes
		for (const stageButton of stageButtons) {
			let statusElem = container.querySelector(`.${stageButton.badgeClass}`);
			if (statusElem) {
				return stageButton.value;
			}
		}

		return null;
	} catch (error) {
		console.error("Error getting current status:", error);
		return null;
	}
}

function injectQuickViewCandidateTab(params) {
	try {
		let row = document.querySelector(`tr[id="${params.id}"]`);
		let rowParams = JSON.parse(row.dataset.params);

		let [orgId] = location.pathname.match(/(?<=\/org)[0-9]+(?=\/)/i) ?? [];
		const url = `https://recruit.zoho.com/recruit/org${orgId}/EditEntity.do?module=Candidates&id=${rowParams.candId}`;

		let tabItem = document.createElement("li");
		tabItem.innerHTML = '<a href="javascript:;" data-tab="14">Candidate</a>';

		let target = document.querySelector("#qs-navigation li:nth-last-child(2)");
		target.insertAdjacentElement("afterend", tabItem);

		let frame = document.createElement("iframe");
		frame.style = "border: none; width: 100%; height: 100vh;";
		frame.src = url;

		let container = document.createElement("div");
		container.classList.add("qsts-container");
		container.appendChild(frame);

		let tabContent = document.createElement("div");
		tabContent.classList.add("qst-section");
		tabContent.id = "qs-tab14";
		tabContent.appendChild(container);

		let tabContents = document.querySelector("#qs-tab-content");
		tabContents.appendChild(tabContent);
	} catch (error) {
		console.error(error);
		notify(error.message, "error");
	}
}

async function injectQuickViewAssociateJob(container, params) {
	try {
		let target = container.querySelector("#social-icons");

		let div = document.createElement("div");
		div.style = "display: inline-flex; gap: 5px; padding-left: 10px;";

		target.insertAdjacentElement("beforeend", div);

		let group = document.createElement("div");
		group.classList.add("newSelect");

		let select = document.createElement("select");
		// select.style = 'width: 250px;'
		select.id = "qv-job-select";
		select.dataset.candidateId = params.id;

		for (const job of jobs) {
			let option = document.createElement("option");
			option.value = job.ENTITYID;
			option.innerText = job.CONTENT[0];
			select.appendChild(option);
		}

		group.appendChild(select);

		chrome.runtime.sendMessage({
			action: "init-select2",
			selector: `#${select.id}`,
		});

		let btn = document.createElement("button");
		btn.classList.add("zrc-btn-positive");
		btn.innerText = "Associate now";
		btn.addEventListener("click", onAssociateJobButtonClick);

		div.appendChild(group);
		div.appendChild(btn);
	} catch (error) {
		console.error(error);
		notify(error.message, "error");
	}
}

function onAssociateJobButtonClick(e) {
	e.preventDefault();
	e.stopPropagation();

	let select = document.querySelector("#qv-job-select");

	let btn = this;
	let oldText = btn.innerText;

	btn.disabled = true;
	btn.innerText = "Associating...";

	const candidateId = select.dataset.candidateId;
	const jobId = select.value;

	associateCandidatesWithJob(candidateId, jobId, function () {
		btn.disabled = false;
		btn.innerText = oldText;
	});
}

async function updateStatus(entityId, actualStatusVal, callback) {
	try {
		let [orgId] = location.pathname.match(/(?<=\/org)[0-9]+(?=\/)/i) ?? [];
		let csrf = document.querySelector('input[name="crmcsrfparam"]');

		let options = {
			method: "POST",
			headers: {
				"Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
				"x-recruit-org": orgId,
				"x-requested-with": "XMLHttpRequest",
			},
			body: new URLSearchParams({
				module: "Applications",
				entityId,
				comments: "",
				status: actualStatusVal,
				actualStatusVal,
				isunlock: "false",
				canCount: "",
				crmcsrfparam: csrf.value,
			}),
		};

		const url = `${location.origin}/recruit/org${orgId}/UpdateResumeStatus.do`;
		const response = await fetch(url, options);

		if (response.ok) {
			let json = await response.json();
			console.log(json);

			if (json.message === "success") {
				callback(actualStatusVal);
			} else {
				notify("Unable to update status, no success message received", "error");
			}
		} else {
			notify(
				`Unable to update status. Server response: ${response.status}`,
				"error"
			);
		}
	} catch (error) {
		console.error(error);
		notify(error.message, "error");
	}
}

async function associateCandidatesWithJob(candidateId, jobId, callback) {
	try {
		let [orgId] = location.pathname.match(/(?<=\/org)[0-9]+(?=\/)/i) ?? [];
		let csrf = document.querySelector('input[name="crmcsrfparam"]');

		let options = {
			method: "POST",
			headers: {
				"Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
				"x-recruit-org": orgId,
				"x-requested-with": "XMLHttpRequest",
			},
			body: new URLSearchParams({
				camp_status: "Pre-ShortListed",
				description: "",
				id: jobId,
				crmcsrfparam: csrf.value,
				frommodule: "Potentials",
				tomodule: "Leads",
				entityId: candidateId,
				isBulk: "false",
				queryId: "707589000030836003",
				searchText: "",
				totalIds: jobs.map((job) => job.ENTITYID).join(";"),
				encryptedFiltersSearch: "",
				encryptedAdvSearch: "",
			}),
		};

		const url = `${location.origin}/recruit/org${orgId}/AddToCampaigns.do`;
		const response = await fetch(url, options);

		if (response.ok) {
			let json = await response.json();
			console.log(json);

			if (json.message === "success") {
				notify(`Candidate associated with job successfully!`, "success");
			} else {
				notify(
					"Unable to associate candidate with job, no success message received",
					"error"
				);
			}
		} else {
			notify(
				`Unable to associate candidate with job. Server response: ${response.status}`,
				"error"
			);
		}
	} catch (error) {
		console.error(error);
		notify(error.message, "error");
	}

	callback && callback();
}

async function fetchJobOpenings() {
	jobs.length = 0;

	try {
		let [orgId] = location.pathname.match(/(?<=\/org)[0-9]+(?=\/)/i) ?? [];

		let options = {
			headers: {
				"x-recruit-org": orgId,
			},
		};

		const params = new URLSearchParams({
			module: "Potentials",
			submodule: "Potentials",
			toolTip: "Job Openings",
			isload: true,
			clearCache: false,
		});

		const url = `${
			location.origin
		}/recruit/org${orgId}/ShowDetails.do?${params.toString()}`;
		const response = await fetch(url, options);

		if (response.ok) {
			let json = await response.json();
			console.log(`Fetched ${json.rowCount} job openings`);

			jobs.push(...json.body);
		} else {
			notify(
				`Unable to fetch job openings. Server response: ${response.status}`,
				"error"
			);
		}
	} catch (error) {
		console.error(error);
		notify(error.message, "error");
	}

	// Fallback: Load job openings from configuration if dynamic fetch failed or returned no results
	if (jobs.length === 0) {
		try {
			console.log(
				"Dynamic job fetch failed or returned no results, using configuration fallback"
			);
			const response = await chrome.runtime.sendMessage({
				action: "get_dropdown_values",
			});

			if (response.success && response.values && response.values.length > 0) {
				console.log(
					`Loaded ${response.values.length} job openings from configuration`
				);

				// Convert configuration format to expected job format
				const configJobs = response.values.map((job) => ({
					ENTITYID: job.value,
					CONTENT: [job.text],
				}));

				jobs.push(...configJobs);
			} else {
				console.warn(
					"Failed to load job openings from configuration:",
					response.error || "No values found"
				);
			}
		} catch (configError) {
			console.error(
				"Error loading job openings from configuration:",
				configError
			);
		}
	}
}

function notify(msg, type = "info") {
	toastr[type](msg, null, {
		timeOut: 5000,
		extendedTimeOut: 5000,
		closeButton: true,
		positionClass: "toast-bottom-left",
		progressBar: true,
	});
}

// Function to refresh pipeline configuration (can be called manually if needed)
function refreshPipelineConfiguration() {
	console.log("Refreshing pipeline configuration...");
	stageButtons = [];
	loadPipelineConfiguration();
}

// Function to check if we're on the pipeline configuration page
function isPipelineConfigurationPage() {
	return document.querySelector("#setupPipeline") !== null;
}

// Listen for changes to pipeline configuration if on that page
if (isPipelineConfigurationPage()) {
	console.log("Pipeline configuration page detected, setting up observer...");
	const pipelineObserver = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
				// Refresh configuration when pipeline changes
				setTimeout(refreshPipelineConfiguration, 1000);
			}
		});
	});

	const pipelineContainer = document.querySelector("#setupPipeline");
	if (pipelineContainer) {
		pipelineObserver.observe(pipelineContainer, {
			childList: true,
			subtree: true,
		});
	}
}

// Helper function to clear config cache (for debugging)
async function clearConfigCache() {
	try {
		console.log("Content script: Requesting cache clear...");
		const response = await chrome.runtime.sendMessage({
			action: "clear_config_cache",
		});
		console.log("Content script: Cache clear response:", response);
		return response.success;
	} catch (error) {
		console.error("Content script: Error clearing cache:", error);
		return false;
	}
}

// Make clearConfigCache available globally for debugging
window.clearConfigCache = clearConfigCache;
