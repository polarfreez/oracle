export let enableTTS = false;

// Marked
window.onload = function(){
  const chat_message = document.querySelector("#aiMessage");
  chat_message.innerHTML = marked.parse(chat_message.textContent);

  let historyMessageGroup = document.createElement("div");
  let historyElement = document.querySelector("#history");

  historyMessageGroup.id = 'messageIndex0';
  historyMessageGroup.className = 'messageGroup';

  historyElement.appendChild(historyMessageGroup);
}

$("#submit").click(function () {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
});

const submitButtonElement = document.querySelector("#submit");

submitButtonElement.addEventListener("touchend", (e)=>{
  e.preventDefault();
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  this.addGuestClicked(this.guestName);
})

// Get the hash value without the # character
var hash = window.location.hash.substring(1);

// If the hash value is config, execute the function
if (hash === "config") {
  settingsModal(true);
}

function submitButtonColor() {
	const submitButton = document.querySelector("#submit");
	const submitButtonSVG = submitButton.querySelector("svg");
	const inputField = document.querySelector("#input");

	if (inputField.textContent.trim() == ""){
		submitButton.style.pointerEvents = "none";		
		submitButtonSVG.style.fillColor = "gray !important";
	}else {
		submitButton.style.pointerEvents = "";
		submitButtonSVG.style.fillColor = "white !important";
	}
}

function inputDivDynamic(){
  submitButtonColor();
  const inputDiv = document.querySelector("#input");

  // Get all child nodes of inputDiv
  let childNodes = Array.from(inputDiv.childNodes);

  // Filter out text nodes that only contain whitespace and <br> elements
  let nonEmptyNodes = childNodes.filter(node => {
    return !(node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '') && !(node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR');
  });

  // If there are no non-empty nodes, clear the inputDiv
  if (nonEmptyNodes.length === 0) {
    inputDiv.innerHTML = '';
  }
}

$("#input").on("focus", inputDivDynamic);
$("#input").on("blur", inputDivDynamic);

/* Modal */

// Open modal
$(".loading-container").bind("click", function() {
  settingsModal(true);
});

// Close modal
$("#disableTTS").bind("click", function() {
  settingsModal(false);
});


$('.ttsCheckbox').click(function(){
  if(enableTTS && $(this).prop("checked") == false){
      infoWarning("TTS desativado!", "O TTS foi desativado.")
      enableTTS = false;
      $(".ttsCheckbox").prop("checked", false);
  }else  {
    passwordModal(true);
  }
});



$("#confirmPassword").bind("click", function() {
  var passwordConfirm = confirmPassword();
  if(passwordConfirm == true){
    passwordModal(false);
  }
});

$("#closePasswordModal").bind("click", function() {
  passwordModal(false);
});

$("#closeSettingsModal").bind("click", function(){
  settingsModal(false);
  passwordModal(false);
});



export function settingsModal(enable) {
  const modal = document.querySelector("#settingsModal");
  const overlay = document.querySelector('#overlay');
   if (enable){
    window.location.hash = 'config';
    overlay.style.display = 'block';
      modal.style.display = 'block';
      modal.style.animation = 'fadeIn 0.25s ease-in-out forwards';
      // Delaying the animation start to ensure display:block takes effect first
      setTimeout(() => {
        modal.style.opacity = '1';
      }, 260);

      var elementsToEnable = document.querySelectorAll('*:not(#settingsModal, #settingsModal *, #ttsModalPassword, ttsModalPassword *, body, head, html, #overlay, #overlay2)');
      elementsToEnable.forEach(function(element) {
        element.style.pointerEvents = 'none';
        element.style.userSelect = 'none';
      });
  }else {
    remHash();
    overlay.style.display = 'none';
    var elementsToEnable = document.querySelectorAll('*:not(#settingsModal, #settingsModal *, #ttsModalPassword, ttsModalPassword *, body, head, html, #overlay, #overlay2)');
    elementsToEnable.forEach(function(element) {
      element.style.pointerEvents = '';
      element.style.userSelect = '';
    });
    modal.style.animation = 'fadeOut 0.25s ease-in-out forwards';
    setTimeout(() => {
      modal.style.display = 'none';
      modal.style.opacity = '0';
    }, 260);
  }
}

export function passwordModal(enable) {
  const modal = document.querySelector("#ttsModalPassword");
  const overlay = document.querySelector("#overlay")
  const overlay2 = document.querySelector("#overlay2");
   if (enable){
    overlay2.style.display = 'block';
    overlay.style.display = 'none';
    modal.style.display = 'block';
    modal.style.animation = 'fadeIn 0.25s ease-in-out forwards';
    setTimeout(() => {
      modal.style.opacity = '1';
    }, 260);

    modal.style.pointerEvents = '';
    modal.style.userSelect = '';

    var elementsToDisable = modal.querySelectorAll('*');
    elementsToDisable.forEach(function (element) {
      element.style.pointerEvents = '';
      element.style.userSelect = '';
    });

    var elementsToDisable = document.querySelectorAll('*:not(#ttsModalPassword, #ttsModalPassword *, body, head, html, #overlay, #overlay2)');
    elementsToDisable.forEach(function(element) {
      element.style.pointerEvents = 'none';
      element.style.userSelect = 'none';
    });


  }else {
    overlay2.style.display = 'none';
    overlay.style.display = 'block';
    var elementsToEnable = document.querySelectorAll('#settingsModal *, #settingsModal');
    elementsToEnable.forEach(function(element) {
      element.style.pointerEvents = '';
      element.style.userSelect = '';
    });

    
    modal.style.animation = 'fadeOut 0.25s ease-in-out forwards';
    setTimeout(() => {
      modal.style.display = 'none';
      modal.style.opacity = '0';
    }, 260);
  }
}

function clickOutside(){
  $("#overlay").bind("click", function() {
    settingsModal(false);
  });
  $("#overlay2").bind("click", function() {
    passwordModal(false);
  });
}



clickOutside();

/* TTS */

function setVolume(audioElement){
  $(audioElement).on('timeupdate', function() {				
    var vol = 1,
    interval = 200; // 200ms interval
    if (audioElement.currentTime >= audioElement.duration * 0.99) {
        if (audioElement.volume == 1) {
            var intervalID = setInterval(function() {
	        // Reduce volume by 0.05 as long as it is above 0
	        // This works as long as you start with a multiple of 0.05!
	        if (vol > 0) {
	            vol -= 0.05;
	            // limit to 2 decimal places
                    // also converts to string, works ok
                    audioElement.volume = vol.toFixed(2);
	        } else {
	            // Stop the setInterval when 0 is reached
	            clearInterval(intervalID);
	        }
            }, interval);
        }
    }
});
}


const voiceId = 'CaTHjV84MxieZtIYEDMt';

export function tts(text, enable, password) {
  if (enable){
    const textToSpeech = async (inputText) => {
      const response = await fetch('https://stella-backend.vercel.app/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({ text: inputText, voice_id: voiceId, password: password })
      });
    
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    
      return response.body; // Return the ReadableStream
    };
    
    const generateAudio = async (inputText) => {
      const audioStream = await textToSpeech(inputText);
      const audio = new Audio();
      // create a blob URL from the audio stream
      const blob = await new Response(audioStream).blob();
      const url = URL.createObjectURL(blob);
      // assign the blob URL to the src property
      audio.src = url;
      setVolume(audio);
      
      return audio;
    };

    return generateAudio(text);
  }
}


function createWarningElement(id, iconClass, msgClass) {
  var div = document.createElement("div");
  div.id = id;
  div.className = msgClass;

  var closeBtn = document.createElement("span");
  closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
  closeBtn.className = "close-btn";
  closeBtn.onclick = function() {
    div.style.animation = "fadeOut 0.5s ease-in-out forwards";
    setTimeout(() => {
      div.style.display = 'none';
      document.querySelector("#messageContainer").removeChild(div);
    }, 500);
  };

  var i = document.createElement("i");
  i.className = iconClass;
  div.appendChild(i);

  var strong = document.createElement("strong");
  var p = document.createElement("p");
  div.appendChild(strong);
  div.appendChild(p);
  div.appendChild(closeBtn);

  return div;
}

export function successfulWarning(boldText, text){
  var warning = createWarningElement("successfulWarning", "fa fa-check", "success-msg");
  displayWarning(warning, boldText, text);
}

export function infoWarning(boldText, text){
  var warning = createWarningElement("infoWarning", "fa fa-info-circle", "info-msg");
  displayWarning(warning, boldText, text);
}

export function alertWarning(boldText, text){
  var warning = createWarningElement("alertWarning", "fa fa-warning", "warning-msg");
  displayWarning(warning, boldText, text);
}

export function errorWarning(boldText, text){
  var warning = createWarningElement("errorWarning", "fa fa-times-circle", "error-msg");
  displayWarning(warning, boldText, text);
}

function displayWarning(warning, boldText, text){
  var container = document.querySelector("#messageContainer");
  var bold = warning.querySelector("strong");
	var normal = warning.querySelector("p");
  var fadeSpeed = 5000;
  bold.textContent = boldText;
	normal.textContent = ' ' + text;
  warning.style.opacity = '0';
  container.appendChild(warning);
  warning.style.display = 'flex';
  warning.style.animation = "fadeIn 0.5s ease-in-out forwards";
  warning.style.opacity = '1';

  setTimeout(() => {
    warning.style.animation = "fadeOut 0.5s ease-in-out forwards";
  }, fadeSpeed);
  
  setTimeout(() => {
    warning.style.display = 'none';
    container.removeChild(warning);
  }, fadeSpeed + 400);
}


export async function confirmPassword(password) {
  const response = await fetch(`127.0.0.1:3000/api/check-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
    mode: "no-cors"
  });
  const data = await response.json();

  if (data.success) {
    enableTTS = true;
    return true;
  } else {
    enableTTS = false;
    return false;
  }

  return data;
}

/* export function confirmPassword() {
  const ttsPassword = '@Rafafa2105';
  const passwordInput = document.querySelector("#ttsPassword").value;
  if (passwordInput == ttsPassword){
      enableTTS = true;
      successfulWarning("Senha correta!", "O TTS está ativado agora.");
      $(".ttsCheckbox").prop("checked", true);
      passwordModal(false);
  }else{
      enableTTS = false;
      errorWarning("Senha incorreta!", "Tente novamente.");
      $(".ttsCheckbox").prop("checked", false);
  }
} */


jQuery( document).ready(function($){
	var copyid = 0;
	$('pre').each(function(){
		copyid++;
		$(this).attr( 'data-copyid', copyid).wrap( '<div class="pre-wrapper"/>');
		$(this).parent().css( 'margin', $(this).css( 'margin') );
		$('<button class="copy-snippet">Copy</button>').insertAfter( $(this) ).data( 'copytarget',copyid );
	});

	$('body').on( 'click', '.copy-snippet', function(ev){
		ev.preventDefault();

		var $copyButton = $(this);

		$pre = $(document).find('pre[data-copyid=' + $copyButton.data('copytarget' ) + ']');
		if ( $pre.length ) {
			var textArea = document.createElement("textarea");

			// Place in top-left corner of screen regardless of scroll position.
			textArea.style.position = 'fixed';
			textArea.style.top = 0;
			textArea.style.left = 0;

			// Ensure it has a small width and height. Setting to 1px / 1em
			// doesn't work as this gives a negative w/h on some browsers.
			textArea.style.width = '2em';
			textArea.style.height = '2em';
			
			// We don't need padding, reducing the size if it does flash render.
			textArea.style.padding = 0;

			// Clean up any borders.
			textArea.style.border = 'none';
			textArea.style.outline = 'none';
			textArea.style.boxShadow = 'none';

			// Avoid flash of white box if rendered for any reason.
			textArea.style.background = 'transparent';

			//Set value to text to be copied
			textArea.value = $pre.html();

			document.body.appendChild(textArea);
			textArea.select();

			try {
				document.execCommand('copy');
				$copyButton.text( 'Copied').prop('disabled', true);;
			} catch (err) {
				$copyButton.text( 'FAILED: Could not copy').prop('disabled', true);;
			}
			setTimeout(function(){
				$copyButton.text( 'Copy').prop('disabled', false);;
			}, 3000);
		}
	});
});
    
 

window.onhashchange = function(){
  switch(location.hash) {
    case '#config':
      settingsModal(true);
    break;
  }
}

function remHash() {
  var uri = window.location.toString();
  if (uri.indexOf("#") > 0) {
     var clean_uri = uri.substring(0, uri.indexOf("#"));
     window.history.replaceState({}, document.title, clean_uri);
  }
}



