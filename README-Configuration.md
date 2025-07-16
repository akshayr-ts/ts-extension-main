# Chrome Extension Dynamic Configuration System

This Chrome extension now supports **dynamic configuration** that can be updated without reinstalling the extension! 🎉

## 📋 Features

### 1. **Centralized Configuration**

- All settings are pulled from a remote JSON configuration file
- Updates automatically every 30 minutes
- No need to reinstall or update the extension

### 2. **Configurable Settings**

- **Zoho URLs**: Support multiple Zoho domains (com, eu, in, au)
- **Job Dropdown Values**: Dynamically populated from configuration
- **Auto-Applications Settings**: Timing, debug mode, retry intervals
- **UI Settings**: Theme, notifications, refresh intervals

### 3. **Fallback System**

- Uses cached configuration if remote fetch fails
- Falls back to default values if no configuration is available
- Graceful degradation ensures extension always works

## 🚀 Setup Instructions

### Step 1: Create Configuration File

1. Open `config-manager.html` in your browser
2. Configure your settings:
   - Add your Zoho base URLs
   - Add job openings with IDs and titles
   - Set auto-application preferences
   - Configure UI settings
3. Click "Generate Configuration"
4. Copy the generated JSON

### Step 2: Host Configuration File

Choose one of these hosting options:

#### Option A: GitHub (Recommended - Free)

1. Create a public GitHub repository
2. Upload your `plugin-config.json` file
3. Get the raw URL: `https://raw.githubusercontent.com/username/repo/main/plugin-config.json`

#### Option B: N8N Webhook

1. Create an N8N workflow that returns your JSON configuration
2. Use the webhook URL as your config endpoint

#### Option C: Cloud Storage

1. Upload to AWS S3, Google Cloud Storage, etc.
2. Make sure the file is publicly accessible

### Step 3: Update Extension

1. Edit `js/sw.js`
2. Update the `CONFIG_URL` constant with your hosted JSON URL:
   ```javascript
   const CONFIG_URL = "https://your-config-url.com/plugin-config.json";
   ```

### Step 4: Reload Extension

1. Go to Chrome Extensions page
2. Click "Reload" on your extension
3. The extension will automatically fetch the new configuration!

## 📁 Configuration File Structure

```json
{
	"version": "1.0.0",
	"last_updated": "2025-07-16T10:00:00Z",
	"zoho_config": {
		"base_urls": ["https://recruit.zoho.com", "https://recruit.zoho.eu"],
		"url_patterns": [
			"https://recruit.zoho.com/recruit/*/ShowDetails.do*",
			"https://recruit.zoho.eu/recruit/*/ShowDetails.do*"
		]
	},
	"dropdown_values": {
		"job_openings": [
			{
				"value": "707589000031645325",
				"text": "Account Director (Research) TEST"
			}
		],
		"default_selection": "707589000031645325"
	},
	"auto_applications": {
		"enabled": true,
		"retry_interval": 500,
		"max_wait_time": 10000,
		"debug": false
	},
	"ui_settings": {
		"theme": "modern",
		"show_notifications": true,
		"auto_refresh_interval": 1800000
	}
}
```

## 🔄 How It Works

1. **Service Worker**: Fetches configuration every 30 minutes
2. **Caching**: Stores configuration locally for offline use
3. **Broadcasting**: Notifies all tabs when configuration updates
4. **Content Scripts**: Request configuration from service worker as needed

## 🛠️ Configuration Manager

Use the included `config-manager.html` tool to:

- ✅ Easily create and edit configurations
- ✅ Validate JSON structure
- ✅ Download configuration files
- ✅ Copy to clipboard
- ✅ Preview generated config

## 📊 Benefits

### For Users:

- No need to reinstall extension for updates
- Always get latest job openings and settings
- Works across different Zoho regions

### For Admins:

- Update configurations centrally
- Roll out changes instantly
- Monitor usage and versions
- Easy backup and version control

## 🔧 Advanced Usage

### Manual Configuration Refresh

```javascript
// In browser console on any Zoho page:
chrome.runtime.sendMessage({ action: "get_config" }, (response) => {
	console.log("Current config:", response.config);
});
```

### Debug Mode

Enable debug mode in configuration to see detailed logs:

```json
{
	"auto_applications": {
		"debug": true
	}
}
```

### Custom Refresh Intervals

Adjust how often configuration is fetched:

```json
{
	"ui_settings": {
		"auto_refresh_interval": 900000 // 15 minutes
	}
}
```

## 📞 Support

If you encounter issues:

1. Check browser console for error messages
2. Verify your configuration JSON is valid
3. Ensure the config URL is publicly accessible
4. Check that CORS is properly configured

## 🎯 Next Steps

Now you can:

1. **Update job openings** by editing the configuration file
2. **Add new Zoho regions** by updating base URLs
3. **Adjust timing settings** for better performance
4. **Enable/disable features** without code changes
5. **Roll out updates** to all users instantly

Enjoy your dynamic, self-updating Chrome extension! 🚀
