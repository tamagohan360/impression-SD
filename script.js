const GITHUB_USER = "tamagohan360";
const REPOSITORY = "impression-SD";
const IMAGE_FOLDER = "images";

const GAS_URL =
  "https://script.google.com/macros/s/AKfycby-cBshtQaIloNtTn-qkV2XBin0IwqbOpJ-cG87Vm18GUTPTcjVS1Z3ZkgakLdJKYjQ/exec";

const IMAGE_COUNT = 5;

// 左側を1、右側を5とする5段階SD法
const QUESTIONS = [
  ["不真面目", "真面目"],
  ["洗練されていない", "洗練された"],
  ["暖かそう", "涼しげ"],
  ["ダサい", "おしゃれ"],
  ["暗い", "明るい"],
  ["かわいい", "かっこいい"],
  ["安そう", "高級感がある"],
  ["フォーマル", "カジュアル"],
  ["硬い", "柔らかい"],
  ["すっきりしている", "かさばっている"],
  ["目立たない", "目立つ"],
  ["今っぽい", "昔っぽい"],
  ["つまらない", "面白い"],
  ["もてなさそう", "もてそう"],
  ["弱そう", "強そう"],
  ["爽やかでない", "爽やか"],
  ["装飾的", "シンプル"],
  ["地味", "華やか"],
  ["子供っぽい", "大人っぽい"],
  ["品がない", "上品"]
];

const RESPONDENT_KEY = "impressionSDRespondentId";
const ANSWERS_KEY = "impressionSDAnswers";
const INDEX_KEY = "impressionSDCurrentIndex";

// 元の index.html に存在する要素を取得
const statusEl = document.getElementById("status");
const surveyEl = document.getElementById("survey");
const completeEl = document.getElementById("complete");
const imageEl = document.getElementById("clothing-image");
const imageNameEl = document.getElementById("image-name");
const questionsEl = document.getElementById("questions");
const formEl = document.getElementById("answer-form");
const submitButton = document.getElementById("submit-button");
const progressText = document.getElementById("progress-text");
const progressBar = document.getElementById("progress-bar");

let images = [];
let respondentId = "";
let currentIndex = 0;
let answers = [];

function showError(message) {
  statusEl.textContent = message;
  statusEl.classList.add("error");
  statusEl.hidden = false;
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ブラウザ側でユニークIDを生成（CORSエラー回避）
function getRespondentId() {
  let saved = localStorage.getItem(RESPONDENT_KEY);
  if (!saved) {
    saved = "R" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    localStorage.setItem(RESPONDENT_KEY, saved);
  }
  return saved;
}

// GitHubから画像一覧を取得
async function getImages() {
  const api = `https://api.github.com/repos/\({GITHUB_USER}/\){REPOSITORY}/contents/${IMAGE_FOLDER}`;
  const response = await fetch(api);
  if (!response.ok) {
    throw new Error("画像一覧を取得できません。GitHubのimagesフォルダを確認してください。");
  }
  const data = await response.json();
  return data
    .filter(item => item.type === "file" && /\.(jpe?g|png|webp)$/i.test(item.name))
    .map(item => ({ name: item.name, url: item.download_url }));
}

// 質問項目（5段階ラジオボタン）の描画
function renderQuestions() {
  questionsEl.innerHTML = "";
  QUESTIONS.forEach(([left, right], index) => {
    const row = document.createElement("div");
    row.className = "question";
    
    const title = document.createElement("div");
    title.className = "question-title";
    title.textContent = `\({index + 1}.\){left} ― ${right}`;
    row.appendChild(title);

    const scale = document.createElement("div");
    scale.className = "scale";
    const descriptions = ["左に近い", "やや左", "どちらでもない", "やや右", "右に近い"];
    
    for (let value = 1; value <= 5; value++) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `q${index}`;
      input.value = String(value);
      input.required = true;
      
      const number = document.createElement("span");
      number.className = "scale-number";
      number.textContent = String(value);
      
      const desc = document.createElement("span");
      desc.className = "scale-desc";
      desc.textContent = descriptions[value - 1];
      
      label.append(input, number, desc);
      scale.appendChild(label);
    }
    row.appendChild(scale);
    questionsEl.appendChild(row);
  });
}

// 現在の枚数の画像・進捗バーの表示
function renderCurrentImage() {
  if (currentIndex >= images.length || currentIndex >= IMAGE_COUNT) {
    surveyEl.hidden = true;
    completeEl.hidden = false;
    statusEl.hidden = true;
    localStorage.removeItem(ANSWERS_KEY);
    localStorage.removeItem(INDEX_KEY);
    return;
  }

  const image = images[currentIndex];
  progressText.textContent = `\({currentIndex + 1} /\){Math.min(images.length, IMAGE_COUNT)} 枚目`;
  progressBar.style.width = `${((currentIndex + 1) / Math.min(images.length, IMAGE_COUNT)) * 100}%`;
  imageEl.src = image.url;
  imageEl.alt = `評価する服の画像 ${currentIndex + 1}`;
  imageNameEl.textContent = image.name;
  renderQuestions();

  const previous = answers.find(item => item.image === image.name);
  if (previous) {
    previous.scores.forEach((score, i) => {
      const input = questionsEl.querySelector(`input[name="q\({i}"][value="\){score}"]`);
      if (input) input.checked = true;
    });
  }
}

// 送信ボタンクリック時の処理
formEl.addEventListener("submit", async event => {
  event.preventDefault();
  if (!formEl.reportValidity()) return;

  const scores = QUESTIONS.map((_, i) => {
    const selected = formEl.querySelector(`input[name="q${i}"]:checked`);
    return selected ? Number(selected.value) : null;
  });

  if (scores.some(value => !Number.isInteger(value) || value < 1 || value > 5)) {
    showError("すべての項目を回答してください。");
    return;
  }

  const image = images[currentIndex];
  const answer = { image: image.name, scores };
  const existing = answers.findIndex(item => item.image === image.name);
  if (existing >= 0) answers[existing] = answer;
  else answers.push(answer);

  submitButton.disabled = true;
  submitButton.textContent = "送信中...";
  statusEl.hidden = false;
  statusEl.classList.remove("error");
  statusEl.textContent = "回答を送信しています...";

  try {
    await fetch(GAS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ respondentId, image: image.name, scores })
    });

    currentIndex++;
    localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
    localStorage.setItem(INDEX_KEY, String(currentIndex));
    statusEl.textContent = "送信処理を行いました。次の画像に進みます。";
    renderCurrentImage();
  } catch (error) {
    showError("送信に失敗しました。通信環境を確認して、もう一度お試しください。");
    console.error(error);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "この画像の回答を送信";
  }
});

// 初期化
async function init() {
  try {
    respondentId = getRespondentId();
    const allImages = await getImages();
    if (allImages.length < IMAGE_COUNT) {
      throw new Error(`imagesフォルダに画像が\({IMAGE_COUNT}枚以上必要です。現在は\){allImages.length}枚です。`);
    }

    const savedAnswers = JSON.parse(localStorage.getItem(ANSWERS_KEY) || "[]");
    const savedIndex = Number(localStorage.getItem(INDEX_KEY) || "0");
    answers = Array.isArray(savedAnswers) ? savedAnswers : [];
    images = shuffle(allImages).slice(0, IMAGE_COUNT);

    const savedImages = JSON.parse(localStorage.getItem("impressionSDImages") || "null");
    if (Array.isArray(savedImages) && savedImages.length === IMAGE_COUNT) {
      const byName = new Map(allImages.map(item => [item.name, item]));
      const restored = savedImages.map(name => byName.get(name));
      if (restored.every(Boolean)) images = restored;
    } else {
      localStorage.setItem("impressionSDImages", JSON.stringify(images.map(item => item.name)));
    }

    currentIndex = Number.isInteger(savedIndex) && savedIndex >= 0 ? savedIndex : 0;
    statusEl.hidden = true;
    surveyEl.hidden = false;
    renderCurrentImage();
  } catch (error) {
    showError(error.message || "読み込み中にエラーが発生しました。");
    console.error(error);
  }
}

init();
