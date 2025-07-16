if(window !== parent) {
    let timer = setInterval(() => {
        if(!document.head) return
        clearInterval(timer)
        
        let styles = '<style>#tabLayer,#cancelLeadsBtn,#wmstoolbar,.new-form-edit-layout{display: none !important;}</style>'
        document.head.insertAdjacentHTML('beforeend', styles)
    }, 100)

    const url = location.href
    
    chrome.runtime.onMessage.addListener(request => {
        if(request.status === 'request-completed') {
            notify('Candidate updated successfully', 'success')
            location.href = url
        }
    })
    
    function notify(msg, type = 'info') {
        toastr[type](msg, null, {positionClass: 'toast-bottom-left'})
    }
}