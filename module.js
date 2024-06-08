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
import { AutoTokenizer } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.15.1";
import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.15.1";

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

let messages = "";
var formatedDate;
var generating = false;
const uploadContainer = document.querySelector(".upload-container");
const fileInput = document.getElementById("file-upload");
const fileNameSpan = document.querySelector(".file-name");
const fileUploadButton = document.querySelector(".upload-button");
const fileContentIcon = document.querySelector(".file-icon");
const removeButton = document.querySelector(".remove-icon");

let attachedFileName = "";
let fileToBeAttached = '';

var isFileOnChat = false;
var textFileContent = "";

// A function that requests a file from the server and logs its contents
function historyReader(date) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "./instructions.txt", true);

  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == 200) {
      var fileContent = xhr.responseText;
      messages += fileContent;
    }
  };

  xhr.send();
}

if (generating) {
  let loadingCircle = document.querySelector(".maskedCircle");
  let blinkValue = getRandomDuration(0, 1);

  loadingCircle.style.animation = `color 0.3s linear forwards, glow 0.3s linear forwards`;
  loadingCircle.style.opacity = blinkValue;

  loadingCircle.style.transition = "all 0.1s linear";
} else {
  let loadingCircle = document.querySelector(".maskedCircle");
  loadingCircle.style.animation =
    "reverseColor 1s linear forwards, reverseGlow 1s linear forwards, blink 1s infinite linear";
}

window.onload = function () {
  clearFileInput();

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

async function* textStreamRes(hf, controller, messages) {
  let tokens = [];
  for await (const output of hf.textGenerationStream(
    {
      model: "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO",
      inputs: messages,
      parameters: { temperature: 0.9, top_p: 0.75, max_new_tokens: 2048 },
    },
    {
      use_cache: false,
      signal: controller.signal,
    }
  )) {
    tokens.push(output);
    yield tokens;
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
  const message = "<|im_start|>user\n{:}<|im_end|>\n\n<|im_start|>assistant\n";
  const input = message.replace("{:}", rawInput);
  const token = "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";
  const hf = new HfInference(token);
  let gen = document.querySelector(`#messageIndex${messageIndex} #aiMessage`);
  let loadingCircle = document.querySelector(".maskedCircle");
  messages += fileToBeAttached + input;
  fileToBeAttached = '';

  gen.innerHTML = "";
  try {
    for await (const tokens of textStreamRes(hf, controller, messages)) {
      const lastToken = tokens[tokens.length - 1];
      const lastTokenFormated = lastToken.token.text;
      gen.textContent += lastTokenFormated.replace("<|im_end|>", "");
      messages += lastTokenFormated;

      if (lastTokenFormated == "<|im_end|>") {
        gen.innerHTML = marked.parse(gen.textContent);
        let historyElement = document.querySelector("#history");
        let historyMessageGroup = document.querySelector(
          "#messageIndex" + messageIndex
        );
        let userProfileElement = document.createElement("div");

        setTimeout(() => {
          historyElement.lastElementChild.scrollIntoView({
            behavior: "smooth",
          });
        }, 0);
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
        const loadingIcon = `<div id="loading-logo"><svg id="ehi1EILjPQc1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 945 848" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
<style><![CDATA[
#ehi1EILjPQc2 {animation: ehi1EILjPQc2_c_o 900ms linear infinite normal forwards}@keyframes ehi1EILjPQc2_c_o { 0% {opacity: 0.5} 33.333333% {opacity: 1} 66.666667% {opacity: 1} 100% {opacity: 0.5}} #ehi1EILjPQc3 {animation: ehi1EILjPQc3_c_o 900ms linear infinite normal forwards}@keyframes ehi1EILjPQc3_c_o { 0% {opacity: 1} 33.333333% {opacity: 1} 66.666667% {opacity: 0.5} 100% {opacity: 1}} #ehi1EILjPQc4 {animation: ehi1EILjPQc4_c_o 900ms linear infinite normal forwards}@keyframes ehi1EILjPQc4_c_o { 0% {opacity: 1} 33.333333% {opacity: 0.5} 66.666667% {opacity: 1} 100% {opacity: 1}}
]]></style>
<path id="ehi1EILjPQc2" d="M804.33,117.8l-74.11,74.19q-.95.96-2.39.96h-511.35c-.922092.00024-1.80348-.363108-2.45-1.01l-73.89-74.03c-.754098-.756046-.758568-1.976215-.01-2.73l73.88-74.12c.780946-.787328,1.842947-1.230128,2.95-1.23l510.35-.01c1.157916-.000156,2.270234.46421,3.09,1.29q34.75,34.72,72.07,72.17q1.19,1.2,2,2.24c.533042.687158.473108,1.66322-.14,2.28Z" opacity="0.5" fill="#fff"/><path id="ehi1EILjPQc3" d="M300.14,779.13C214.91,632.33,129.82,485.44,44.69,338.58q-1.07-1.85-.96-3.45.13-1.77.61-3.56q12.9-48.15,26.32-98.62c.205483-.781646.917387-1.324834,1.73-1.32q1.15.01,2.31.32q49.89,13.37,99.26,26.45c1.107878.294561,2.056493,1.016802,2.64,2.01Q304.34,480.69,432.38,701.59q1.2,2.07.58,4.38-12.57,46.99-25.19,94.27-.9,3.36-1.82,6.36-.41,1.32-1.76.97L302.12,780.64c-.831518-.217033-1.544214-.760554-1.98-1.51Z" fill="#fff"/><path id="ehi1EILjPQc4" d="M512.51,700.18c84.66-145.9,169.53-292.5,254.55-438.66q1.36-2.33,3.75-2.97q50.2-13.34,100.41-26.7c.551979-.147061,1.139522-.069438,1.632949.215737s.852172.754455.997051,1.304263l26.83,100.77c.288195,1.075698.137053,2.220056-.42,3.18L643.73,779.61q-.59,1.02-1.74,1.32L540.61,807.67q-2.03.54-2.57-1.49-13.68-51.26-26.85-100.56c-.6-2.26.24-3.59,1.32-5.44Z" fill="#fff"/></svg>
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
          const imgElement = document.createElement("img");
          gen.querySelector("#loading-logo").remove();
          imgElement.src = imagePath;
          imgElement.alt = "AI Image";
          gen.firstChild.replaceWith(imgElement);
        }

        setTimeout(() => {
          fadeInOut(gen, "fadeIn", "flex");
        }, 500);

        messageIndex++;
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
    }
  } catch (e) {
    errorWarning("Um erro ocorreu!", e);
    console.log(e);
  }
}

$("#clearHistory").bind("click", function () {
  messages = "";
  historyReader(formatedDate);
  clearFileInput();
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

      if (isFileOnChat) {
        const filePopUp = document.createElement("div");
        filePopUp.id = "file-pop-up";

        filePopUp.innerHTML = `<div class="file-info"><svg class="file-icon" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z"/></svg><span class="file-name-attached"></span></div>`;
        filePopUp.querySelector(".file-name-attached").textContent =
          attachedFileName;
        filePopUp.querySelector(".file-info").style.bottom = "0";
        filePopUp.querySelector(".file-info").style.right = "0";
        filePopUp.querySelector(".file-info").styles.display = 'flex';
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
      clearFileInput();
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
    const app = await client("AP123/Playground-v2.5");
    const result = await app.predict("/generate_image", [		
    				prompt, // string  in 'Enter your image prompt' Textbox component		
    			  75, // number (numeric value between 1 and 75) in 'Number of Inference Steps' Slider component		
    				7.5, // number (numeric value between 1 and 10) in 'Guidance Scale' Slider component
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
      username: "Oracle",
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
        "Um email foi enviado para o criador de Oracle, Polar."
      );
    })
    .fail(function (error) {
      errorWarning("Oops... ", JSON.stringify(error));
    });
}

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = () => {
    textFileContent = reader.result;
    console.log("File content:", messages);
    fileNameSpan.textContent = file.name;
    fileNameSpan.parentElement.style.display = "flex";
    removeButton.style.display = "flex";
    fileContentIcon.style.display = "flex";
    fileUploadButton.style.display = "none";
    uploadContainer.style.zIndex = "-20";
    isFileOnChat = true;
    attachedFileName = file.name;
    fileToBeAttached = "<|im_start|>attached_document_by_user\n" + reader.result + "<|im_end|>";

    // Do something with the file content (history variable)
  };

  reader.readAsText(file);
});

removeButton.addEventListener("click", () => {
  clearFileInput();
});

function clearFileInput() {
  fileInput.value = "";
  fileNameSpan.textContent = "";
  fileNameSpan.parentElement.style.display = "none";
  removeButton.style.display = "none";
  fileContentIcon.style.display = "none";
  fileUploadButton.style.display = "flex";
  uploadContainer.style.zIndex = "0";
  isFileOnChat = false;
  fileToBeAttached = '';
}
