import { HfInference } from "https://cdn.skypack.dev/@huggingface/inference@2.6.4";
import { tts } from "./index.js";
import { settingsModal } from "./index.js";
import { passwordModal } from "./index.js";
import { successfulWarning } from "./index.js";
import { infoWarning } from "./index.js";
import { alertWarning } from "./index.js";
import { errorWarning } from "./index.js";
import { enableTTS } from "./index.js";
import { client } from "https://cdn.jsdelivr.net/npm/@gradio/client@0.12.1/+esm";
import { AutoTokenizer } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.15.1';

import { Marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

const { markedHighlight } = globalThis.markedHighlight;
hljs.addPlugin(
  new CopyButtonPlugin({
    hook: (text, el) => text.toUpperCase(),
  })
);

const marked = new Marked(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  })
);

let history = "";
var formatedDate;
var generating = false;
const uploadContainer = document.querySelector('.upload-container')
const fileInput = document.getElementById('file-upload');
const fileNameSpan = document.querySelector('.file-name');
const fileUploadButton = document.querySelector('.upload-button');
const fileContentIcon = document.querySelector('.file-icon')
const removeButton = document.querySelector('.remove-icon');

let attachedFileName = '';

var isFileOnChat = false;
var textFileContent = '';

// A function that requests a file from the server and logs its contents
function historyReader(date) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "./instructions.txt", true);

  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == 200) {
      var fileContent = xhr.responseText;
      history = fileContent;
    }
  };

  xhr.send();
}
window.onload = function () {
  cleanFileInput();

  const timeZone = "America/Sao_Paulo"; // 'America/Sao_Paulo' corresponds to GMT-3
  const locale = "pt-BR";

  const currentDate = new Date();
  const options = {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  };

  formatedDate = new Intl.DateTimeFormat(locale, options).format(currentDate);

  historyReader(formatedDate);

};

function getRandomDuration(value1, value2) {
  // Generate a random number between 0 (inclusive) and 1 (exclusive)
  const randomValue = Math.random();

  // Check if the random number is less than 0.2
  if (randomValue < 0.2) {
    return value1;
  } else {
    return value2;
  }
}

async function* textStreamRes(hf, controller, input) {
  const requestBody = {
    model: "mixtral-8x7b",
    messages: messages,
    temperature: 0.9,
    top_p: 0.75,
    max_tokens: 2048,
    use_cache: false,
    stream: true,
  };

  const response = await fetch('https://rafaaa2105-text-generation.hf.space/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: controller.signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  const reader = response.body.getReader();
  let decoder = new TextDecoder('utf-8');
  let tokens = [];

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data:')) {
        const data = JSON.parse(line.slice(6));
        if (data.choices && data.choices.length > 0) {
          const token = data.choices[0].delta.content;
          if (token) {
            tokens.push(token);
            yield tokens;
          }
        }
      }
    }
  }

  console.log(await tokens);
}

$("#confirmPassword").bind("click", function () {
  confirmPassword(document.querySelector("#ttsPassword").value);
});

function playParagraphs(element) {
  let elements = element.querySelectorAll("p, ul, ol");
  let audios = Array.from(elements).map((element) => {
    let text = "";
    let text2 = "";
    text = element.textContent.replace("██████ ████", "--");
    text2 = text.replace("████", "--");
    return tts(text2, true, "@Rafafa2105");
  });

  Promise.all(audios).then((audios) => {
    let i = 0;
    function playNextAudio() {
      if (i < audios.length) {
        audios[i].play();
        let loadingCircle = document.querySelector(".maskedCircle");
        loadingCircle.style.animation =
          "reverseColor 1s linear forwards, reverseGlow 1s linear forwards, blink 1s infinite linear";
        audios[i].onended = playNextAudio;
        i++;
      }
    }
    playNextAudio();
  });
}

var messageIndex = 0;

async function run(rawInput) {
  const controller = new AbortController();
  const token = ""; // Replace this with your actual token, if needed
  const hf = new HfInference(token);
  let gen = document.querySelector(`#messageIndex${messageIndex} #aiMessage`);
  let loadingCircle = document.querySelector(".maskedCircle");

  history.push({ role: "user", content: rawInput }); // Add the user's input to the history

  gen.innerHTML = "";
  try {
    for await (const tokens of textStreamRes(hf, controller, history)) {
      const lastToken = tokens[tokens.length - 1];
      gen.textContent += lastToken;

      if (lastToken.startsWith("data:")) {
        const data = JSON.parse(lastToken.slice(6));
        if (data.choices && data.choices.length > 0) {
          const assistantResponse = data.choices[0].delta.content;
          if (assistantResponse) {
            history.push({ role: "assistant", content: assistantResponse }); // Add the assistant's response to the history
          }
        }
      }
        // check if gen has any pre elements
        if (gen.querySelectorAll("pre").length > 0) {
          // get all the pre elements in gen
          let preElements = gen.querySelectorAll("pre");
          // loop through each pre element
          for (let pre of preElements) {
            // create a button element
            let button = document.createElement("button");
            // add the copy-button class to the element
            button.setAttribute("class", "copy-button");
            // create a SVG element with the SVG namespace
            let svg = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "svg"
            );
            // set the SVG attributes
            svg.setAttribute("viewBox", "0 -960 960 960");
            // create a path element with the SVG namespace
            let path = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "path"
            );
            // set the path attributes
            path.setAttribute(
              "d",
              "M 320 -240 C 298 -240 279.167 -247.833 263.5 -263.5 C 247.833 -279.167 240 -298 240 -320 L 240 -800 C 240 -822 247.833 -840.833 263.5 -856.5 C 279.167 -872.167 298 -880 320 -880 L 800 -880 C 822 -880 840.833 -872.167 856.5 -856.5 C 872.167 -840.833 880 -822 880 -800 L 880 -320 C 880 -298 872.167 -279.167 856.5 -263.5 C 840.833 -247.833 822 -240 800 -240 L 320 -240 Z M 320 -320 L 800 -320 L 800 -800 L 320 -800 L 320 -320 Z M 160 -80 C 138 -80 119.167 -87.833 103.5 -103.5 C 87.833 -119.167 80 -138 80 -160 L 80 -720 L 160 -720 L 160 -160 L 720 -160 L 720 -80 L 160 -80 Z M 320 -800 L 320 -320 L 320 -800 Z"
            );
            // append the path to the SVG
            svg.appendChild(path);
            // append the SVG to the button
            button.appendChild(svg);
            // append the button to the pre element
            pre.appendChild(button);
            // add a click event listener to the button
            button.addEventListener("click", function () {
              // get the text content of the pre element
              let text = pre.textContent;
              // copy the text to the clipboard using the navigator.clipboard API
              navigator.clipboard
                .writeText(text)
                .then(() => {
                  // show a success message
                  infoWarning(
                    "Copiado!",
                    "O texto foi copiado para sua área de transferência."
                  );
                })
                .catch((error) => {
                  // show an error message
                  errorWarning("A cópia falhou:", error);
                });
            });
          }
        }

        generating = false;

        // TTS part
        if (enableTTS) {
          playParagraphs(gen);
        } else {
          loadingCircle.style.animation =
            "reverseColor 1s linear forwards, reverseGlow 1s linear forwards, blink 1s infinite linear";
        }

        // Extract the email content using a regular expression
	const emailContentRegex = /sendEmail\("([^"]+)"\)/g;
	const emailContentMatches = gen.textContent.match(emailContentRegex);
	
	console.log(emailContentMatches);
	
	// Check if there are matches
	if (emailContentMatches) {
	  // Extract content between quotes and replace any occurrences of '\n' with actual line breaks
	  const formatedEmailContent = emailContentMatches.map((match) =>
	    match.match(/sendEmail\("([^"]+)"\)/g)[1].replace(/\\n/g, "\n")
	  );
	  console.log(formatedEmailContent);
	
	  // Agora você pode fazer o que quiser com o conteúdo extraído
	  sendEmail(formatedEmailContent);
	
	  // Se você quiser remover as chamadas de sendEmail do texto original
	  gen.textContent = gen.textContent.replace(emailContentRegex, "");
	}


	const createImageRegex = /createImage\("([^"]+)"\)/g;
	const loadingIcon = `<div id="loading-logo">
  <svg id="ecznbdgItRN1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 945 945" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
<style><![CDATA[
#ecznbdgItRN2_to {animation: ecznbdgItRN2_to__to 2000ms linear infinite normal forwards}@keyframes ecznbdgItRN2_to__to { 0% {transform: translate(472.728571px,165.153774px);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 20% {transform: translate(472.728571px,165.153774px);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 40% {transform: translate(472.728571px,165.153774px);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 60% {transform: translate(705.122636px,568.401056px);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 80% {transform: translate(239.877368px,568.401059px);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 100% {transform: translate(472.730753px,165.154998px)}} #ecznbdgItRN2_tr {animation: ecznbdgItRN2_tr__tr 2000ms linear infinite normal forwards}@keyframes ecznbdgItRN2_tr__tr { 0% {transform: rotate(0deg);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 20% {transform: rotate(0deg);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 40% {transform: rotate(0deg);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 60% {transform: rotate(-60deg);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 80% {transform: rotate(-120deg);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 100% {transform: rotate(-180deg)}} #ecznbdgItRN3_to {animation: ecznbdgItRN3_to__to 2000ms linear infinite normal forwards}@keyframes ecznbdgItRN3_to__to { 0% {transform: translate(238.674017px,568.40546px);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 20% {transform: translate(238.674017px,568.40546px);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 40% {transform: translate(472.408703px,165.316756px);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 60% {transform: translate(706.136125px,568.40089px);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 80% {transform: translate(238.675613px,568.40453px)} 100% {transform: translate(238.675613px,568.40453px)}} #ecznbdgItRN3_tr {animation: ecznbdgItRN3_tr__tr 2000ms linear infinite normal forwards}@keyframes ecznbdgItRN3_tr__tr { 0% {transform: rotate(0deg);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 20% {transform: rotate(0deg);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 40% {transform: rotate(-60deg);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 60% {transform: rotate(-120deg);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 80% {transform: rotate(-180deg)} 100% {transform: rotate(-180deg)}} #ecznbdgItRN4_to {animation: ecznbdgItRN4_to__to 2000ms linear infinite normal forwards}@keyframes ecznbdgItRN4_to__to { 0% {transform: translate(511.220095px,856.404623px);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 20% {transform: translate(390.633543px,881.208094px);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 40% {transform: translate(819.375166px,189.95456px);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 60% {transform: translate(901.05139px,280.398762px)} 100% {transform: translate(901.05139px,280.398762px)}} #ecznbdgItRN4_tr {animation: ecznbdgItRN4_tr__tr 2000ms linear infinite normal forwards}@keyframes ecznbdgItRN4_tr__tr { 0% {transform: rotate(0deg);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 20% {transform: rotate(-60deg);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 40% {transform: rotate(-120deg);animation-timing-function: cubic-bezier(0.785,0.135,0.15,0.86)} 60% {transform: rotate(-180deg)} 100% {transform: rotate(-180deg)}}
]]></style>
<g id="ecznbdgItRN2_to" transform="translate(472.728571,165.153774)"><g id="ecznbdgItRN2_tr" transform="rotate(0)"><path d="M804.33,117.8l-74.11,74.19q-.95.96-2.39.96h-511.35c-.922092.00024-1.80348-.363108-2.45-1.01l-73.89-74.03c-.754098-.756046-.758568-1.976215-.01-2.73l73.88-74.12c.780946-.787328,1.842947-1.230128,2.95-1.23l510.35-.01c1.157916-.000156,2.270234.46421,3.09,1.29q34.75,34.72,72.07,72.17q1.19,1.2,2,2.24c.533042.687158.473108,1.66322-.14,2.28Z" transform="translate(-472.202316,-116.385002)" fill="#fff"/></g></g><g id="ecznbdgItRN3_to" transform="translate(238.674017,568.40546)"><g id="ecznbdgItRN3_tr" transform="rotate(0)"><path d="M300.14,779.13C214.91,632.33,129.82,485.44,44.69,338.58q-1.07-1.85-.96-3.45.13-1.77.61-3.56q12.9-48.15,26.32-98.62c.205483-.781646.917387-1.324834,1.73-1.32q1.15.01,2.31.32q49.89,13.37,99.26,26.45c1.107878.294561,2.056493,1.016802,2.64,2.01Q304.34,480.69,432.38,701.59q1.2,2.07.58,4.38-12.57,46.99-25.19,94.27-.9,3.36-1.82,6.36-.41,1.32-1.76.97L302.12,780.64c-.831518-.217033-1.544214-.760554-1.98-1.51Z" transform="translate(-238.445469,-519.636688)" fill="#fff"/></g></g><g id="ecznbdgItRN4_to" transform="translate(511.220095,856.404623)"><g id="ecznbdgItRN4_tr" transform="rotate(0)"><path d="M512.51,700.18c84.66-145.9,169.53-292.5,254.55-438.66q1.36-2.33,3.75-2.97q50.2-13.34,100.41-26.7c.551979-.147061,1.139522-.069438,1.632949.215737s.852172.754455.997051,1.304263l26.83,100.77c.288195,1.075698.137053,2.220056-.42,3.18L643.73,779.61q-.59,1.02-1.74,1.32L540.61,807.67q-2.03.54-2.57-1.49-13.68-51.26-26.85-100.56c-.6-2.26.24-3.59,1.32-5.44Z" transform="translate(-510.991547,-807.781982)" fill="#fff"/></g></g></svg>
</div>`;
	
	const createImageMatches = gen.innerText.match(createImageRegex);
	
	if (createImageMatches) {
	  const formatedImagePrompt = createImageMatches.map((match) =>
	    match.match(/createImage\("([^"]+)"\)/)[1].replace(/\\n/g, "\n")
	  );
	  console.log(formatedImagePrompt);
		// Display the loading icon
		gen.innerHTML = gen.innerHTML.replace(createImageRegex, loadingIcon);
	
	  const imagePath = await createImage(formatedImagePrompt);
		
	  // Remove the loading icon and insert the actual image
	  const imgElement = document.createElement('img');
		gen.querySelector("#loading-logo").remove();
	  imgElement.src = imagePath;
	  imgElement.alt = 'AI Image';
	  gen.firstChild.replaceWith(imgElement);
	}

        setTimeout(() => {
          fadeInOut(gen, "fadeIn", "flex");
        }, 500);

        messageIndex++;
      } else if (
        lastTokenFormated.includes("{{user}}") ||
        lastTokenFormated.includes("END_OF_DIALOG")
      ) {
        gen.innerHTML = marked.parse(gen.textContent);
        let historyElement = document.querySelector("#history");
        let historyMessageGroup = document.querySelector(
          "#messageIndex" + messageIndex
        );
        let userProfileElement = document.createElement("div");

        gen.id = "aiMessage";

        setTimeout(() => {
          historyElement.lastElementChild.scrollIntoView({
            behavior: "smooth",
          });
        }, 0);

        if (gen.textContent.includes("END_OF_DIALOG")) {
          gen.textContent = gen.textContent.replace("END_OF_DIALOG", "");
        }

        // check if gen has any pre elements
        if (gen.querySelectorAll("pre").length > 0) {
          // get all the pre elements in gen
          let preElements = gen.querySelectorAll("pre");
          // loop through each pre element
          for (let pre of preElements) {
            // create a button element
            let button = document.createElement("button");
            // add the copy-button class to the element
            button.setAttribute("class", "copy-button");
            // create a SVG element with the SVG namespace
            let svg = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "svg"
            );
            // set the SVG attributes
            svg.setAttribute("viewBox", "0 -960 960 960");
            // create a path element with the SVG namespace
            let path = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "path"
            );
            // set the path attributes
            path.setAttribute(
              "d",
              "M 320 -240 C 298 -240 279.167 -247.833 263.5 -263.5 C 247.833 -279.167 240 -298 240 -320 L 240 -800 C 240 -822 247.833 -840.833 263.5 -856.5 C 279.167 -872.167 298 -880 320 -880 L 800 -880 C 822 -880 840.833 -872.167 856.5 -856.5 C 872.167 -840.833 880 -822 880 -800 L 880 -320 C 880 -298 872.167 -279.167 856.5 -263.5 C 840.833 -247.833 822 -240 800 -240 L 320 -240 Z M 320 -320 L 800 -320 L 800 -800 L 320 -800 L 320 -320 Z M 160 -80 C 138 -80 119.167 -87.833 103.5 -103.5 C 87.833 -119.167 80 -138 80 -160 L 80 -720 L 160 -720 L 160 -160 L 720 -160 L 720 -80 L 160 -80 Z M 320 -800 L 320 -320 L 320 -800 Z"
            );
            // append the path to the SVG
            svg.appendChild(path);
            // append the SVG to the button
            button.appendChild(svg);
            // append the button to the pre element
            pre.appendChild(button);
            // add a click event listener to the button
            button.addEventListener("click", function () {
              // get the text content of the pre element
              let text = pre.textContent;
              // copy the text to the clipboard using the navigator.clipboard API
              navigator.clipboard
                .writeText(text)
                .then(() => {
                  // show a success message
                  infoWarning(
                    "Copiado!",
                    "O texto foi copiado para sua área de transferência."
                  );
                })
                .catch((error) => {
                  // show an error message
                  errorWarning("A cópia falhou:", error);
                });
            });
          }
        }

        generating = false;

        // TTS part
        if (enableTTS) {
          playParagraphs(gen);
        } else {
          loadingCircle.style.animation =
            "reverseColor 1s linear forwards, reverseGlow 1s linear forwards, blink 1s infinite linear";
        }

        setTimeout(() => {
          fadeInOut(gen, "fadeIn", "flex");
        }, 500);

        messageIndex++;
      } else {
        let blinkValue = getRandomDuration(0, 1);

        loadingCircle.style.animation = `color 0.3s linear forwards, glow 0.3s linear forwards`;
        loadingCircle.style.opacity = blinkValue;

        loadingCircle.style.transition = "all 0.1s linear";
      }
    }
  } catch (e) {
    errorWarning("Um erro ocorreu!", e);
    console.log(e);
  }
}

$("#clearHistory").bind("click", function () {
  historyReader(formatedDate);
  cleanFileInput();
  let historyElement = document.querySelector("#history");
  infoWarning("Chat resetado!", "O histórico dessa conversa foi limpo!");
  historyElement.style.animation = "fadeOut 0.5s ease-in-out forwards";
  setTimeout(() => {
    $("#history div").not("#messageIndex0, #messageIndex0 *").remove();
    historyElement.style.animation = "fadeIn 0.5s ease-in-out forwards";
  }, 525);
});

document.addEventListener("keydown", function (event) {
  const isShiftPressed = event.shiftKey;
  const isEnterPressed = event.key === "Enter";
  const passwordModalElement = document.querySelector("#ttsModalPassword");
  const settingsModalElement = document.querySelector("#settingsModal");

  if (
    isEnterPressed &&
    !isShiftPressed &&
    passwordModalElement.style.display != "block" &&
    settingsModalElement.style.display != "block"
  ) {
    event.preventDefault();
    const inputElement = document.querySelector("#input");
    if (generating) {
      alertWarning("Calma amigão", "Uma mensagem de cada vez.");
    } else if (!inputElement.innerText.trim()) {
      window.scrollTo(window.innerWidth, window.innerHeight);
      alertWarning("Input vazio!", "Insira pelo menos um caractere.");
    } else {
      messageIndex++;
      window.scrollTo(window.innerWidth, window.innerHeight);
      generating = true;
      let userMessageElement = document.createElement("div");
      let historyMessageGroup = document.createElement("div");
      let userProfileElement = document.createElement("div");
      let historyElement = document.querySelector("#history");
      let aiMessageElement = document.createElement("div");
        let aiProfileElement = document.createElement("div");


      userProfileElement.id = "userProfile";
      userMessageElement.id = "userMessage";
              aiProfileElement.id = "aiProfile";
                    aiMessageElement.id = "aiMessage";
      userMessageElement.innerHTML = marked.parse(
        inputElement.innerText.trim()
      );

      historyMessageGroup.id = "messageIndex" + messageIndex;
      historyMessageGroup.className = "messageGroup";

      historyMessageGroup.appendChild(userMessageElement);
      historyMessageGroup.appendChild(userProfileElement);

        if(isFileOnChat){
          const filePopUp = document.createElement("div");
          filePopUp.id = "file-pop-up";

          filePopUp.innerHTML = `<div class="file-info"><svg class="file-icon" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z"/></svg><span class="file-name-attached"></span></div>`;
          filePopUp.querySelector(".file-name-attached").textContent = attachedFileName;
          filePopUp.querySelector(".file-info").style.bottom = '0';
          filePopUp.querySelector(".file-info").style.right = '0';
          userMessageElement.appendChild(filePopUp);
        }

        historyMessageGroup.appendChild(aiMessageElement);
        historyMessageGroup.appendChild(aiProfileElement);
      historyElement.appendChild(historyMessageGroup);
      setTimeout(() => {
        historyElement.lastElementChild.scrollIntoView({ behavior: "smooth" });
      }, 0);

      fadeInOut(userMessageElement, "fadeIn", "flex");

      var inputValue = inputElement.innerText.trim();
      console.log(inputValue);

      inputElement.innerHTML = "";
      run(inputValue);
      cleanFileInput();
    }
  } else if (
    isEnterPressed &&
    passwordModalElement.style.display == "block" &&
    settingsModalElement.style.display != "block"
  ) {
    event.preventDefault();
    $("#confirmPassword").trigger("click");
  }
});

function fadeInOut(DOMElement, fadeType, displayType) {
  if (fadeType == "fadeOut") {
    DOMElement.style.animation = "fadeOut 0.5s ease-in-out forwards";
    setTimeout(() => {
      DOMElement.style.display = "none";
      console.log(false);
    }, 500);
  } else if (fadeType == "fadeIn") {
    console.log(true);
    DOMElement.style.display = `${displayType}`;
    DOMElement.style.animation = "fadeIn 0.5s ease-in-out forwards";
  }
}

async function createImage(prompt) {
  try {
	const app = await client("ddosxd/stable-cascade");
	const result = await app.predict("/run", [		
					prompt, // string  in 'Prompt' Textbox component		
					"verybadimagenegative_v1.3, ng_deepnegative_v1_75t, (ugly face:0.8),cross-eyed,sketches, (worst quality:2), (low quality:2), (normal quality:2), lowres, normal quality, ((monochrome)), ((grayscale)), skin spots, acnes, skin blemishes, bad anatomy, DeepNegative, facing away, tilted head, {Multiple people}, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worstquality, low quality, normal quality, jpegartifacts, signature, watermark, username, blurry, bad feet, cropped, poorly drawn hands, poorly drawn face, mutation, deformed, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, extra fingers, fewer digits, extra limbs, extra arms,extra legs, malformed limbs, fused fingers, too many fingers, long neck, cross-eyed,mutated hands, polar lowres, bad body, bad proportions, gross proportions, text, error, missing fingers, missing arms, missing legs, extra digit, extra arms, extra leg, extra foot, ((repeating hair))", // string  in 'Negative prompt' Textbox component		
					0, // number (numeric value between 0 and 2147483647) in 'Seed' Slider component		
					1024, // number (numeric value between 1024 and 1536) in 'Width' Slider component		
					1024, // number (numeric value between 1024 and 1536) in 'Height' Slider component		
					20, // number (numeric value between 10 and 30) in 'Prior Inference Steps' Slider component		
					4, // number (numeric value between 0 and 20) in 'Prior Guidance Scale' Slider component		
					10, // number (numeric value between 4 and 12) in 'Decoder Inference Steps' Slider component		
					0, // number (numeric value between 0 and 0) in 'Decoder Guidance Scale' Slider component		
					1, // number (numeric value between 1 and 2) in 'Number of Images' Slider component
		]);

    console.log(result.data);

    return result.data[0].url;
  } catch (error) {
		errorWarning("Error in createImage function: ", error);
    console.error("Error in createImage function:", error);
    return null;
  }
}

function sendEmail(emailMessage) {
  var data = {
    service_id: "ai_email",
    template_id: "template",
    user_id: "yfMumZ6mND0C_MP2k",
    template_params: {
      username: "STEM",
      "g-recaptcha-response": "03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...",
      message: emailMessage,
    },
  };

  $.ajax("https://api.emailjs.com/api/v1.0/email/send", {
    type: "POST",
    data: JSON.stringify(data),
    contentType: "application/json",
  })
    .done(function () {
      infoWarning(
        "Seu email foi enviado! ",
        "Um email foi enviado para o criador de STEM, Stoltz."
      );
    })
    .fail(function (error) {
      errorWarning("Oops... ", JSON.stringify(error));
    });
}

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = () => {
    history += "<|im_start|>attached_document_by_user\n" + reader.result + "<|im_end|>";
    textFileContent = reader.result;
    console.log('File content:', history);
    fileNameSpan.textContent = file.name;
    fileNameSpan.parentElement.style.display = 'flex';
    removeButton.style.display = 'flex';
    fileContentIcon.style.display = 'flex';
    fileUploadButton.style.display = 'none';
    uploadContainer.style.zIndex = '-20';
    isFileOnChat = true;
    attachedFileName = file.name;
    
    // Do something with the file content (history variable)
  };

  reader.readAsText(file);
});

removeButton.addEventListener('click', () => {
  cleanFileInput();
});

function cleanFileInput(){
  fileInput.value = '';
  fileNameSpan.textContent = '';
  fileNameSpan.parentElement.style.display = 'none';
  removeButton.style.display = 'none';
  fileContentIcon.style.display = 'none';
  fileUploadButton.style.display = 'flex';
  uploadContainer.style.zIndex = '0';
  isFileOnChat = false;
}
