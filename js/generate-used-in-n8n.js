// Configuration: Set your default organization ID here
const DEFAULT_ORG_ID = "org801559407"; // Change this to your actual org ID

for (const item of items) {
	const jobData = item.json.data[0];

	// Extract Job Opening ID and Name from input data
	const jobOpeningId = jobData.id;
	const jobOpeningName = jobData.Posting_Title || jobData.Job_Opening_Name;

	// Try to extract organization ID dynamically from various possible fields
	let organizationId = DEFAULT_ORG_ID; // Fallback to default

	// Look for organization ID in common fields
	if (jobData.Organization_Id) {
		organizationId = jobData.Organization_Id;
	} else if (jobData.Org_Id) {
		organizationId = jobData.Org_Id;
	} else if (jobData.Owner && jobData.Owner.Organization_Id) {
		organizationId = jobData.Owner.Organization_Id;
	} else if (jobData.Created_By && jobData.Created_By.Organization_Id) {
		organizationId = jobData.Created_By.Organization_Id;
	} else if (item.json.organization_id) {
		organizationId = item.json.organization_id;
	} else if (item.json.org_id) {
		organizationId = item.json.org_id;
	}

	// Ensure org ID has proper format (starts with 'org')
	if (organizationId && !organizationId.startsWith("org")) {
		organizationId = `org${organizationId}`;
	}

	if (jobOpeningId && jobOpeningName) {
		const filter = {
			searchfieldtype: "ASSJO",
			searchfield: "CrmPotential:POTENTIALID",
			searchModule: "Potentials",
			condition: "0",
			// This 'value' field requires BOTH the ID and the Name, separated by a colon
			value: `${jobOpeningId}:${jobOpeningName}`,
			entityname: jobOpeningName, // The entityname also uses the name
			assPopOutView: true,
		};
		const encodedFilter = encodeURIComponent(JSON.stringify([filter]));

		// DIRECT APPROACH: Job opening URL with correct submodule that extension will handle
		// The browser extension will auto-click Applications when this URL is visited
		const directJobUrl = `https://recruit.zoho.com/recruit/${organizationId}/EntityInfo.do?module=JobOpenings&id=${jobOpeningId}&submodule=JobOpenings&autoClick=applications`;

		// Log the URLs being generated for debugging
		console.log(
			`Generated URLs for Job: ${jobOpeningName} (ID: ${jobOpeningId})`
		);
		console.log(`Organization ID used: ${organizationId}`);
		console.log(`Direct Applications URL: ${directJobUrl}`);

		// Store all generated data for n8n output
		item.json.jobOpeningId = jobOpeningId;
		item.json.jobOpeningName = jobOpeningName;
		item.json.organizationId = organizationId;
		item.json.directApplicationsUrl = directJobUrl;

		// FALLBACK: Complex filter URL (in case extension fails)
		const baseUrl = `https://recruit.zoho.com/recruit/${organizationId}/ShowTab.do`;
		const filtersParam = encodeURIComponent(JSON.stringify([filter]));
		const refreshParam = Date.now().toString();
		const applicationUrl = `${baseUrl}?module=Candidates&filters=${filtersParam}&jobId=${jobOpeningId}&submodule=Applications&tab=Applications&view=list&reload=true&refresh=${refreshParam}&forceLoad=true`;
		item.json.fallbackApplicationUrl = applicationUrl;

		// SOLUTION 1: Auto-redirect HTML page that goes to job opening then clicks Applications
		// Creates a temporary HTML page that automatically navigates to the job opening and clicks Applications in Quick Links
		const autoRedirectHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Redirecting to Applications...</title>
    <style>
        body { font-family: Arial; text-align: center; padding: 50px; }
        .loading { font-size: 18px; color: #333; }
        .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 20px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="loading">Opening Applications for ${jobOpeningName}...</div>
    <div class="spinner"></div>
    <script>
        // Step 1: Navigate to the job opening page with correct submodule
        window.location.href = 'https://recruit.zoho.com/recruit/${organizationId}/EntityInfo.do?module=JobOpenings&id=${jobOpeningId}&submodule=JobOpenings&autoClick=applications';
        
        // Step 2: After page loads, automatically click Applications in Quick Links
        setTimeout(() => {
            // Look for Applications link in Quick Access/Quick Links
            const clickApplications = () => {
                // Multiple selectors to find the Applications button in Quick Links
                const selectors = [
                    'a[href*="Applications"]',
                    '.quick-access a:contains("Applications")',
                    '.quick-links a:contains("Applications")',
                    '[data-module="Applications"]',
                    'a[title*="Applications"]',
                    '.relatedList a:contains("Applications")',
                    'div:contains("Applications") a',
                    '.sidebar a:contains("Applications")',
                    '.shortcut a:contains("Applications")',
                    '.entity-related a:contains("Applications")'
                ];
                
                for (let selector of selectors) {
                    let element = document.querySelector(selector);
                    if (element) {
                        element.click();
                        return true;
                    }
                }
                
                // Fallback: Search by text content in clickable elements
                const allLinks = document.querySelectorAll('a, span[onclick], div[onclick], button');
                for (let el of allLinks) {
                    if (el.textContent && el.textContent.trim().toLowerCase().includes('applications')) {
                        el.click();
                        return true;
                    }
                }
                return false;
            };
            
            // Try clicking immediately, then retry if needed
            if (!clickApplications()) {
                setTimeout(clickApplications, 1000);
                setTimeout(clickApplications, 2000);
                setTimeout(clickApplications, 3000);
            }
        }, 2000);
    </script>
</body>
</html>`;

		// Create data URL for the HTML page
		const htmlDataUrl =
			"data:text/html;charset=utf-8," + encodeURIComponent(autoRedirectHtml);
		item.json.autoRedirectUrl = htmlDataUrl;

		// SOLUTION 2: JavaScript bookmarklet (Alternative approach)
		const bookmarkletScript = `
javascript:(function(){
    window.location.href='https://recruit.zoho.com/recruit/${organizationId}/EntityInfo.do?module=JobOpenings&id=${jobOpeningId}&submodule=JobOpenings';
    setTimeout(function(){
        var apps=document.querySelector('a[href*="Applications"], .quick-access a, .quick-links a');
        if(apps) apps.click();
        else setTimeout(function(){
            var links=document.querySelectorAll('a,span[onclick],div[onclick],button');
            for(var i=0;i<links.length;i++){
                if(links[i].textContent.toLowerCase().includes('applications')){
                    links[i].click();break;
                }
            }
        },1000);
    },2000);
})();`;
		item.json.bookmarkletUrl = bookmarkletScript;

		// SOLUTION 3: Enhanced redirect that goes to job opening then auto-clicks Applications
		const jobOpeningUrl = `https://recruit.zoho.com/recruit/${organizationId}/EntityInfo.do?module=JobOpenings&id=${jobOpeningId}&submodule=JobOpenings`;

		const enhancedRedirectHtml = `<!DOCTYPE html><html><head><title>Opening ${jobOpeningName} Applications</title><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;text-align:center;padding:50px;margin:0}.container{max-width:500px;margin:0 auto}.loading{font-size:20px;margin-bottom:30px}.job-title{font-size:24px;font-weight:bold;margin-bottom:20px}.spinner{border:4px solid rgba(255,255,255,0.3);border-top:4px solid white;border-radius:50%;width:50px;height:50px;animation:spin 1s linear infinite;margin:20px auto}@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}.status{font-size:14px;opacity:0.8;margin-top:20px}.manual-link{display:inline-block;background:rgba(255,255,255,0.2);padding:10px 20px;border-radius:5px;color:white;text-decoration:none;margin-top:20px;border:1px solid rgba(255,255,255,0.3)}.manual-link:hover{background:rgba(255,255,255,0.3)}</style></head><body><div class="container"><div class="job-title">${jobOpeningName}</div><div class="loading">Opening Job Opening...</div><div class="spinner"></div><div class="status" id="status">Redirecting to job opening page...</div><a href="${jobOpeningUrl}" class="manual-link" id="manual-link" style="display:none;">Click here if not redirected automatically</a></div><script>const updateStatus=(message)=>document.getElementById('status').textContent=message;updateStatus('Redirecting to job opening page...');setTimeout(()=>{window.location.href='${jobOpeningUrl}&autoClick=applications';},1500);setTimeout(()=>{document.getElementById('manual-link').style.display='inline-block';updateStatus('Taking longer than expected...');},5000);</script></body></html>`;

		// Generate URLs for different approaches
		item.json.fallbackApplicationUrl = applicationUrl; // Complex filter URL fallback
		item.json.autoRedirectUrl = htmlDataUrl; // Auto-redirect HTML page
		item.json.bookmarkletUrl = bookmarkletScript; // JavaScript bookmarklet
		item.json.enhancedRedirectUrl =
			"data:text/html;charset=utf-8," +
			encodeURIComponent(enhancedRedirectHtml); // MAIN OUTPUT: Enhanced redirect page

		// Set the enhanced redirect URL as the primary output for easy retrieval in n8n
		item.json.primaryUrl = item.json.enhancedRedirectUrl;

		console.log(
			`Enhanced Redirect URL (Primary): ${item.json.enhancedRedirectUrl.substring(
				0,
				100
			)}...`
		);
	} else {
		console.warn(
			`Job ID (${jobOpeningId}) or Job Name (${jobOpeningName}) not found for an item, skipping URL construction.`
		);
		item.json.directApplicationsUrl = null;
		item.json.enhancedRedirectUrl = null;
		item.json.primaryUrl = null;
	}
}
return items;
