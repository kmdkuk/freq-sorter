console.log('Popup script loaded');

document.getElementById('sort-btn')?.addEventListener('click', () => {
  console.log('Sort button clicked');
  chrome.runtime.sendMessage({ command: 'sort' }, (response) => {
    console.log('Sort response:', response);
  });
});
