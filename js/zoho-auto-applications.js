(function () {
	"use strict";

	// Default Configuration - will be updated from centralized config
	let CONFIG = {
		// Maximum time to wait for page to load before giving up (in milliseconds)
		MAX_WAIT_TIME: 10000,
		// Interval between attempts to find and click the Applications link (in milliseconds)
		RETRY_INTERVAL: 500,
		// Debug mode - set to false to reduce console noise
		DEBUG: false,
	};

	// Load configuration from extension storage
	async function loadConfig() {
		try {
			const response = await chrome.runtime.sendMessage({
				action: "get_config",
			});

			if (
				response.success &&
				response.config &&
				response.config.auto_applications
			) {
				const autoAppConfig = response.config.auto_applications;
				CONFIG.MAX_WAIT_TIME =
					autoAppConfig.max_wait_time || CONFIG.MAX_WAIT_TIME;
				CONFIG.RETRY_INTERVAL =
					autoAppConfig.retry_interval || CONFIG.RETRY_INTERVAL;
				CONFIG.DEBUG = autoAppConfig.debug || CONFIG.DEBUG;

				console.log(
					"[Zoho Auto-Applications] Configuration loaded from centralized config"
				);
			} else {
				console.log("[Zoho Auto-Applications] Using default configuration");
			}
		} catch (error) {
			console.warn(
				"[Zoho Auto-Applications] Failed to load configuration, using defaults:",
				error
			);
		}
	}

	// Utility function for debug logging
	function debugLog(message, ...args) {
		if (CONFIG.DEBUG) {
			console.log("[Zoho Auto-Applications]", message, ...args);
		}
	}

	// Check if we're on a job opening page with autoClick parameter or should auto-click anyway
	function shouldAutoClick() {
		const url = window.location.href;
		const isJobOpeningPage =
			url.includes("EntityInfo.do") && url.includes("module=JobOpenings");
		const hasAutoClickParam = url.includes("autoClick=applications");
		const hasJobOpeningsSubmodule = url.includes("submodule=JobOpenings");

		// Auto-click if explicitly requested with autoClick parameter OR if on JobOpenings page with JobOpenings submodule
		return isJobOpeningPage && (hasAutoClickParam || hasJobOpeningsSubmodule);
	}

	// Multiple strategies to find the Applications link
	function findApplicationsLink() {
		const selectors = [
			// Direct href matches for Applications
			'a[href*="Applications"]',
			'a[href*="submodule=Applications"]',
			'a[href*="Candidates"][href*="Applications"]',

			// Quick Access and navigation areas
			'.quick-access a[title*="Applications"]',
			'.quick-access a:contains("Applications")',
			'.relatedList a:contains("Applications")',
			'.sidebar a:contains("Applications")',

			// Quick links specific selectors
			'.quick-links a:contains("Applications")',
			'.quicklinks a:contains("Applications")',
			'.ql-container a:contains("Applications")',
			'.related-list a:contains("Applications")',

			// More generic Zoho selectors
			'.entity-actions a:contains("Applications")',
			'.related-modules a:contains("Applications")',
			'.module-nav a:contains("Applications")',
			'.submodule-nav a:contains("Applications")',

			// Data attributes
			'[data-module="Applications"]',
			'[data-submodule="Applications"]',
			'a[data-title*="Applications"]',

			// Title attributes
			'a[title*="Applications"]',
			'a[title*="applications"]',

			// Class-based selectors
			".applications-link",
			".app-link",

			// Zoho-specific selectors
			'.lyte-shortcut[title*="Applications"]',
			'.shortcut-item[title*="Applications"]',

			// Table-based quick links (common in Zoho)
			'td a:contains("Applications")',
			'tr a:contains("Applications")',
			'.related-info a:contains("Applications")',

			// Link text variations
			'a:contains("View Applications")',
			'a:contains("Show Applications")',
			'a:contains("Applications List")',
		];

		// Try each selector
		for (let selector of selectors) {
			try {
				let element;
				if (selector.includes(":contains(")) {
					// Handle :contains pseudo-selector manually since it's not standard CSS
					const baseSelector = selector.split(":contains(")[0];
					const containsText = selector.match(/:contains\("([^"]+)"\)/)[1];
					const elements = document.querySelectorAll(baseSelector);

					for (let el of elements) {
						if (
							el.textContent &&
							el.textContent.toLowerCase().includes(containsText.toLowerCase())
						) {
							element = el;
							break;
						}
					}
				} else {
					element = document.querySelector(selector);
				}

				if (element && element.offsetParent !== null) {
					// Check if element is visible
					debugLog("Found Applications link:", element.textContent?.trim());
					return element;
				}
			} catch (e) {
				// Ignore selector errors
			}
		}

		// Fallback: Search by text content in all clickable elements
		const clickableElements = document.querySelectorAll(
			"a, button, span[onclick], div[onclick], .clickable"
		);
		for (let el of clickableElements) {
			if (
				el.textContent &&
				el.textContent.trim().toLowerCase().includes("applications")
			) {
				// Make sure it's visible and looks like a navigation element
				if (
					el.offsetParent !== null &&
					(el.href || el.onclick || el.getAttribute("data-module"))
				) {
					debugLog("Found Applications link by text content");
					return el;
				}
			}
		}

		return null;
	}

	// Navigation interceptor to prevent unwanted redirects after auto-click
	let navigationInterceptorActive = false;
	let targetJobId = null;

	function setupNavigationProtection() {
		if (navigationInterceptorActive) return;

		navigationInterceptorActive = true;
		debugLog("Setting up navigation protection");

		// Extract job ID from current URL to identify the correct Applications page
		const urlMatch = window.location.href.match(/id=(\d+)/);
		if (urlMatch) {
			targetJobId = urlMatch[1];
		}

		// Store the original pushState and replaceState functions
		const originalPushState = history.pushState;
		const originalReplaceState = history.replaceState;

		// Function to check if a URL is the wrong Applications page
		function isWrongApplicationsPage(url) {
			if (!url.includes("submodule=Applications")) return false;

			// If we have a target job ID, make sure the Applications page is for the same job
			if (targetJobId) {
				// Allow navigation to Applications page for the same job
				if (
					url.includes(`id=${targetJobId}`) ||
					url.includes(`entityid=${targetJobId}`)
				) {
					return false; // This is the correct Applications page
				}
				// Block if it's an Applications page but for a different job or generic
				return true;
			}

			// If URL doesn't contain our job reference, it's probably a generic Applications page
			// Block navigation to standalone Applications module that's not job-specific
			if (!url.includes("JobOpenings") && !url.includes("module=JobOpenings")) {
				return true;
			}

			return false;
		}

		// Override history.pushState to intercept navigation
		history.pushState = function (state, title, url) {
			if (url && isWrongApplicationsPage(url)) {
				debugLog("Blocked navigation to wrong Applications page:", url);
				return;
			}
			return originalPushState.apply(this, arguments);
		};

		// Override history.replaceState to intercept navigation
		history.replaceState = function (state, title, url) {
			if (url && isWrongApplicationsPage(url)) {
				debugLog("Blocked navigation to wrong Applications page:", url);
				return;
			}
			return originalReplaceState.apply(this, arguments);
		};

		// Intercept window.location changes with proper error handling
		let currentHref = window.location.href;
		let originalLocationAssign, originalLocationReplace;
		let locationOverrideSuccessful = false;

		try {
			originalLocationAssign = window.location.assign;
			originalLocationReplace = window.location.replace;

			// Try to override location.assign
			Object.defineProperty(window.location, "assign", {
				value: function (url) {
					if (isWrongApplicationsPage(url)) {
						debugLog(
							"Blocked location.assign to wrong Applications page:",
							url
						);
						return;
					}
					return originalLocationAssign.call(this, url);
				},
				writable: true,
				configurable: true,
			});

			// Try to override location.replace
			Object.defineProperty(window.location, "replace", {
				value: function (url) {
					if (isWrongApplicationsPage(url)) {
						debugLog(
							"Blocked location.replace to wrong Applications page:",
							url
						);
						return;
					}
					return originalLocationReplace.call(this, url);
				},
				writable: true,
				configurable: true,
			});

			locationOverrideSuccessful = true;
		} catch (e) {
			locationOverrideSuccessful = false;
		}

		// Monitor for any href changes and block unwanted ones
		const hrefMonitor = setInterval(() => {
			if (window.location.href !== currentHref) {
				if (isWrongApplicationsPage(window.location.href)) {
					debugLog(
						"Detected navigation to wrong Applications page, attempting to go back"
					);
					// Try to go back to the previous page
					if (currentHref) {
						window.location.href = currentHref;
					}
				} else {
					currentHref = window.location.href;
				}
			}
		}, 100);

		// Clean up navigation protection after 10 seconds
		setTimeout(() => {
			navigationInterceptorActive = false;
			if (typeof originalPushState === "function") {
				history.pushState = originalPushState;
			}
			if (typeof originalReplaceState === "function") {
				history.replaceState = originalReplaceState;
			}
			if (
				locationOverrideSuccessful &&
				typeof originalLocationAssign === "function"
			) {
				try {
					Object.defineProperty(window.location, "assign", {
						value: originalLocationAssign,
						writable: true,
						configurable: true,
					});
				} catch (e) {
					// Ignore restore errors
				}
			}
			if (
				locationOverrideSuccessful &&
				typeof originalLocationReplace === "function"
			) {
				try {
					Object.defineProperty(window.location, "replace", {
						value: originalLocationReplace,
						writable: true,
						configurable: true,
					});
				} catch (e) {
					// Ignore restore errors
				}
			}
			if (typeof hrefMonitor !== "undefined") {
				clearInterval(hrefMonitor);
			}
		}, 10000);
	}

	// Auto-dismiss popup messages that appear in a loop
	let popupDismissalActive = false;
	function setupPopupDismissal() {
		if (popupDismissalActive) {
			debugLog("Popup dismissal already active, skipping setup");
			return;
		}

		popupDismissalActive = true;
		debugLog("Setting up popup dismissal");

		const popupDismissalInterval = setInterval(() => {
			// Common Zoho popup selectors
			const popupSelectors = [
				// Modal dialogs and alerts
				".modal-dialog .close",
				".modal .close",
				".alert .close",
				".notification .close",
				".toast .close",

				// Zoho-specific popup selectors
				".zp-modal .close",
				".zp-alert .close",
				".lyte-modal .close",
				'[data-dismiss="modal"]',
				'[data-dismiss="alert"]',

				// OK, Close, Cancel buttons in popups
				'.modal button:contains("OK")',
				'.modal button:contains("Close")',
				'.modal button:contains("Cancel")',
				'.alert button:contains("OK")',
				'.alert button:contains("Close")',

				// Generic close buttons
				'button[title="Close"]',
				'button[aria-label="Close"]',
				".close-button",
				".dismiss-button",

				// Zoho toast/notification close buttons
				".toast-close",
				".notification-close",
				".message-close",
			];

			let popupClosed = false;

			for (let selector of popupSelectors) {
				try {
					let closeButton;
					if (selector.includes(":contains(")) {
						// Handle :contains pseudo-selector manually
						const baseSelector = selector.split(":contains(")[0];
						const containsText = selector.match(/:contains\("([^"]+)"\)/)[1];
						const elements = document.querySelectorAll(baseSelector);

						for (let el of elements) {
							if (
								el.textContent &&
								el.textContent
									.trim()
									.toLowerCase()
									.includes(containsText.toLowerCase())
							) {
								closeButton = el;
								break;
							}
						}
					} else {
						closeButton = document.querySelector(selector);
					}

					if (closeButton && closeButton.offsetParent !== null) {
						// Check if this popup contains the "select at least one record" message
						const popupContainer = closeButton.closest(
							".modal, .alert, .notification, .toast, .zp-modal, .zp-alert, .lyte-modal"
						);
						if (popupContainer) {
							const popupText = popupContainer.textContent.toLowerCase();
							if (
								popupText.includes("select at least one") ||
								popupText.includes("please select") ||
								popupText.includes("no records selected") ||
								popupText.includes("choose at least")
							) {
								debugLog("Auto-dismissing popup");

								// Prevent the default action that might cause navigation
								closeButton.addEventListener(
									"click",
									function (e) {
										e.preventDefault();
										e.stopPropagation();
									},
									{ once: true }
								);

								// Store current URL before dismissing popup
								const currentUrl = window.location.href;

								// Set up a more robust navigation prevention
								let navigationPrevented = false;
								const preventNavigation = function (e) {
									if (!navigationPrevented) {
										e.preventDefault();
										e.stopPropagation();
										e.stopImmediatePropagation();
										navigationPrevented = true;
									}
								};

								// Add multiple event listeners to prevent navigation
								document.addEventListener(
									"beforeunload",
									preventNavigation,
									true
								);
								window.addEventListener(
									"beforeunload",
									preventNavigation,
									true
								);

								// Override location changes temporarily with error handling
								const originalHref = window.location.href;
								let locationOverrideActive = true;
								let hrefOverrideSuccessful = false;

								const locationDescriptor =
									Object.getOwnPropertyDescriptor(window.location, "href") ||
									Object.getOwnPropertyDescriptor(Location.prototype, "href");

								// Temporarily override window.location.href setter
								if (locationDescriptor && locationDescriptor.set) {
									try {
										const originalSetter = locationDescriptor.set;
										Object.defineProperty(window.location, "href", {
											set: function (value) {
												if (
													locationOverrideActive &&
													value !== currentUrl &&
													currentUrl.includes("submodule=Applications")
												) {
													return;
												}
												return originalSetter.call(this, value);
											},
											get: locationDescriptor.get,
											configurable: true,
										});
										hrefOverrideSuccessful = true;
									} catch (e) {
										hrefOverrideSuccessful = false;
									}
								}

								closeButton.click();

								// Clean up prevention after a short delay
								setTimeout(() => {
									locationOverrideActive = false;
									document.removeEventListener(
										"beforeunload",
										preventNavigation,
										true
									);
									window.removeEventListener(
										"beforeunload",
										preventNavigation,
										true
									);

									// Restore original href descriptor
									if (hrefOverrideSuccessful && locationDescriptor) {
										try {
											Object.defineProperty(
												window.location,
												"href",
												locationDescriptor
											);
										} catch (e) {
											// Ignore restore errors
										}
									}

									// Final check - if URL changed despite our prevention, force it back
									if (
										window.location.href !== currentUrl &&
										currentUrl.includes("submodule=Applications")
									) {
										window.location.replace(currentUrl);
									}
								}, 500);

								popupClosed = true;
								break;
							}
						}
					}
				} catch (e) {
					// Ignore selector errors
				}
			}

			// Also try to dismiss any visible overlays or backdrop clicks
			if (!popupClosed) {
				const overlays = document.querySelectorAll(
					".modal-backdrop, .overlay, .popup-overlay"
				);
				for (let overlay of overlays) {
					if (overlay.offsetParent !== null) {
						// Store current URL before clicking overlay
						const currentUrl = window.location.href;

						// Use the same robust prevention as with close buttons
						let navigationPrevented = false;
						const preventNavigation = function (e) {
							if (!navigationPrevented) {
								e.preventDefault();
								e.stopPropagation();
								e.stopImmediatePropagation();
								navigationPrevented = true;
							}
						};

						// Add navigation prevention
						document.addEventListener("beforeunload", preventNavigation, true);
						window.addEventListener("beforeunload", preventNavigation, true);

						overlay.click();

						// Clean up after overlay click
						setTimeout(() => {
							document.removeEventListener(
								"beforeunload",
								preventNavigation,
								true
							);
							window.removeEventListener(
								"beforeunload",
								preventNavigation,
								true
							);

							// Check if overlay click caused unwanted navigation
							if (
								window.location.href !== currentUrl &&
								currentUrl.includes("submodule=Applications")
							) {
								window.location.replace(currentUrl);
							}
						}, 300);
						break;
					}
				}
			}
		}, 1000); // Check every second for popups

		// Clean up popup dismissal after 30 seconds
		setTimeout(() => {
			debugLog("Cleaning up popup dismissal");
			popupDismissalActive = false;
			clearInterval(popupDismissalInterval);
		}, 30000);
	}

	// Click the Applications link with enhanced error handling
	function clickApplicationsLink(element) {
		try {
			// Mark that we've initiated the click to prevent re-triggering
			window.zohoAutoApplicationsClicked = true;
			// Also store in sessionStorage for persistence across page loads
			sessionStorage.setItem("zohoAutoApplicationsClicked", "true");

			// Scroll element into view first
			element.scrollIntoView({ behavior: "smooth", block: "center" });

			// Wait a moment for scroll, then click
			setTimeout(() => {
				// Try multiple click methods
				if (element.click) {
					element.click();
				} else if (element.onclick) {
					element.onclick();
				} else {
					// Create and dispatch click event
					const clickEvent = new MouseEvent("click", {
						view: window,
						bubbles: true,
						cancelable: true,
					});
					element.dispatchEvent(clickEvent);
				}

				// Set up navigation protection AFTER the click has been processed
				// Allow time for the legitimate navigation to Applications tab to happen first
				setTimeout(() => {
					setupNavigationProtection();
					setupPopupDismissal(); // Also start dismissing annoying popups
				}, 1000); // Give 1 second for the Applications tab to load
			}, 200);

			// Return true immediately to indicate we've initiated the click process
			return true;
		} catch (error) {
			debugLog("Error clicking Applications link:", error);
			return false;
		}
	}

	// Main function to attempt finding and clicking Applications
	function attemptAutoClick() {
		// Double-check if we've already clicked to prevent race conditions
		if (
			window.zohoAutoApplicationsClicked ||
			sessionStorage.getItem("zohoAutoApplicationsClicked") === "true"
		) {
			return true; // Return true to stop further attempts
		}

		const applicationsLink = findApplicationsLink();
		if (applicationsLink) {
			debugLog("Found Applications link, clicking...");
			return clickApplicationsLink(applicationsLink);
		} else {
			return false;
		}
	}

	// Initialize the auto-click functionality
	async function initialize() {
		// Load configuration first
		await loadConfig();

		// Check if we should auto-click on this page
		if (!shouldAutoClick()) {
			return;
		}

		// Check if we're already on Applications page to avoid infinite clicking
		if (window.location.href.includes("submodule=Applications")) {
			// Set the flag to prevent future attempts
			window.zohoAutoApplicationsClicked = true;
			sessionStorage.setItem("zohoAutoApplicationsClicked", "true");
			return;
		}

		// For JobOpenings pages with autoClick parameter OR submodule=JobOpenings, always try to click regardless of previous attempts
		// This ensures the script works even if flags were set incorrectly
		const hasAutoClickParam = window.location.href.includes(
			"autoClick=applications"
		);
		const hasJobOpeningsSubmodule = window.location.href.includes(
			"submodule=JobOpenings"
		);

		if (hasAutoClickParam || hasJobOpeningsSubmodule) {
			debugLog(
				"Found autoClick parameter or JobOpenings submodule, attempting auto-click"
			);
			// Clear any previous flags for this specific scenario
			window.zohoAutoApplicationsClicked = false;
			sessionStorage.removeItem("zohoAutoApplicationsClicked");
		} else {
			// For other scenarios, check if we've already clicked to prevent infinite loops
			if (
				window.zohoAutoApplicationsClicked ||
				sessionStorage.getItem("zohoAutoApplicationsClicked") === "true"
			) {
				return;
			}
		}

		let attempts = 0;
		const maxAttempts = Math.floor(
			CONFIG.MAX_WAIT_TIME / CONFIG.RETRY_INTERVAL
		);

		const tryClick = () => {
			attempts++;

			// Check if we've already clicked before attempting
			if (
				window.zohoAutoApplicationsClicked ||
				sessionStorage.getItem("zohoAutoApplicationsClicked") === "true"
			) {
				return;
			}

			if (attemptAutoClick()) {
				// Stop trying once we've successfully clicked
				// The flag is already set in clickApplicationsLink function
				return;
			}

			if (attempts >= maxAttempts) {
				return;
			}

			// Try again after interval
			setTimeout(tryClick, CONFIG.RETRY_INTERVAL);
		};

		// Start trying after a short delay to let the page load
		setTimeout(tryClick, 1000);
	}

	// Wait for DOM to be ready
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initialize);
	} else {
		initialize();
	}

	// Also handle dynamic page changes (SPA navigation)
	let lastUrl = window.location.href;
	new MutationObserver(() => {
		const currentUrl = window.location.href;
		if (currentUrl !== lastUrl) {
			lastUrl = currentUrl;

			// Don't re-initialize if we're already on Applications page and auto-click was performed
			if (
				currentUrl.includes("submodule=Applications") &&
				(window.zohoAutoApplicationsClicked ||
					sessionStorage.getItem("zohoAutoApplicationsClicked") === "true")
			) {
				return;
			}

			// Only reset the clicked flag if we're navigating to a completely different job or module
			// Don't reset when going from JobOpenings to Applications (which is our intended flow)
			if (
				!currentUrl.includes("submodule=Applications") &&
				!currentUrl.includes("module=JobOpenings")
			) {
				window.zohoAutoApplicationsClicked = false;
				sessionStorage.removeItem("zohoAutoApplicationsClicked");
			}

			setTimeout(initialize, 500); // Small delay for new content to load
		}
	}).observe(document, { subtree: true, childList: true });

	// Expose a reset function for debugging
	window.resetZohoAutoApplications = function () {
		window.zohoAutoApplicationsClicked = false;
		sessionStorage.removeItem("zohoAutoApplicationsClicked");
		console.log("[Zoho Auto-Applications] Flags reset");
	};
})();
