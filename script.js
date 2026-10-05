```js
const GITHUB_USER = "tamagohan360";
const REPOSITORY = "impression-SD";
const IMAGE_FOLDER = "images";

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbyMXkdPLPzSqs8Y_hEbFne9bC-PPSmVhHuYzNNFhBk03kr4ORJR2uUt9G-0Tfb5ffhN1w/exec";

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

const IMAGE_COUNT = 5;

// 今回使用する画像を指定
const TARGET_IMAGES = [
  "blouse_green (3).jpg",
  "sweater_white (4).jpg",
  "sweater_red (6).jpg",
  "jacket_black (3).jpg",
  "jacket_green (2).jpg"
];

const RESPONDENT_KEY = "impressionSDRespondentId";
const ANSWERS_KEY = "impressionSDAnswers";
const INDEX_KEY = "impressionSDCurrentIndex";
const IMAGES_KEY = "impressionSDImages";

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


// エラー表示
function showError(message) {
  statusEl.textContent = message;
  statusEl.classList.add("error");
  statusEl.hidden = false;
}


// 回答者IDを取得
async function getRespondentId() {
  const saved = localStorage.getItem(RESPONDENT_KEY);

  if (saved) {
    return saved;
  }

  const response = await fetch(GAS_URL, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("回答者IDを取得できませんでした。");
  }

  const data = await response.json();

  if (!data.respondentId) {
    throw new Error("回答者IDが返されませんでした。");
  }

  localStorage.setItem(
    RESPONDENT_KEY,
    data.respondentId
  );

  return data.respondentId;
}


// GitHubのimagesフォルダから画像一覧を取得
async function getImages() {
  const api =
    `https://api.github.com/repos/${GITHUB_USER}/${REPOSITORY}/contents/${IMAGE_FOLDER}`;

  const response = await fetch(api);

  if (!response.ok) {
    throw new Error(
      "画像一覧を取得できません。GitHubのimagesフォルダを確認してください。"
    );
  }

  const data = await response.json();

  return data
    .filter(item =>
      item.type === "file" &&
      /\.(jpe?g|png|webp)$/i.test(item.name)
    )
    .map(item => ({
      name: item.name,
      url: item.download_url
    }));
}


// 20項目の質問を作成
function renderQuestions() {
  questionsEl.innerHTML = "";

  QUESTIONS.forEach(([left, right], index) => {
    const row = document.createElement("div");
    row.className = "question";

    const title = document.createElement("div");
    title.className = "question-title";
    title.textContent =
      `${index + 1}. ${left} ― ${right}`;

    row.appendChild(title);

    const scale = document.createElement("div");
    scale.className = "scale";

    const descriptions = [
      "左に近い",
      "やや左",
      "中間",
      "やや右",
      "右に近い"
    ];

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


// 現在の画像を表示
function renderCurrentImage() {

  if (
    currentIndex >= images.length ||
    currentIndex >= IMAGE_COUNT
  ) {
    surveyEl.hidden = true;
    completeEl.hidden = false;
    statusEl.hidden = true;

    localStorage.removeItem(ANSWERS_KEY);
    localStorage.removeItem(INDEX_KEY);
    localStorage.removeItem(IMAGES_KEY);

    return;
  }

  const image = images[currentIndex];

  progressText.textContent =
    `${currentIndex + 1} / ${IMAGE_COUNT} 枚目`;

  progressBar.style.width =
    `${((currentIndex + 1) / IMAGE_COUNT) * 100}%`;

  imageEl.src = image.url;
  imageEl.alt =
    `評価する服の画像 ${currentIndex + 1}`;

  imageNameEl.textContent = image.name;

  renderQuestions();


  // 既に回答済みの画像なら回答を復元
  const previous = answers.find(
    item => item.image === image.name
  );

  if (previous) {

    previous.scores.forEach((score, i) => {

      const input = questionsEl.querySelector(
        `input[name="q${i}"][value="${score}"]`
      );

      if (input) {
        input.checked = true;
      }

    });

  }
}


// 送信ボタン
formEl.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    // 未回答がないか確認
    if (!formEl.reportValidity()) {
      return;
    }


    // 20項目のスコアを取得
    const scores = QUESTIONS.map((_, i) => {

      const selected = formEl.querySelector(
        `input[name="q${i}"]:checked`
      );

      return selected
        ? Number(selected.value)
        : null;

    });


    // 1～5以外の値がないか確認
    if (
      scores.some(value =>
        !Number.isInteger(value) ||
        value < 1 ||
        value > 5
      )
    ) {

      showError(
        "すべての項目を回答してください。"
      );

      return;
    }


    const image = images[currentIndex];


    const answer = {
      image: image.name,
      scores: scores
    };


    // 既存回答があれば更新
    const existing = answers.findIndex(
      item => item.image === image.name
    );


    if (existing >= 0) {

      answers[existing] = answer;

    } else {

      answers.push(answer);

    }


    submitButton.disabled = true;
    submitButton.textContent = "送信中...";


    statusEl.hidden = false;
    statusEl.classList.remove("error");
    statusEl.textContent =
      "回答を送信しています...";


    try {

      await fetch(GAS_URL, {

        method: "POST",

        mode: "no-cors",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body: JSON.stringify({

          respondentId: respondentId,

          image: image.name,

          scores: scores

        })

      });


      // no-corsではサーバーの保存結果を
      // 直接確認できません
      currentIndex++;


      // 回答を保存
      localStorage.setItem(
        ANSWERS_KEY,
        JSON.stringify(answers)
      );


      // 現在の画像番号を保存
      localStorage.setItem(
        INDEX_KEY,
        String(currentIndex)
      );


      statusEl.textContent =
        "回答を送信しました。次の画像に進みます。";


      renderCurrentImage();


    } catch (error) {

      showError(
        "送信に失敗しました。通信環境を確認して、もう一度お試しください。"
      );

      console.error(error);


    } finally {

      submitButton.disabled = false;

      submitButton.textContent =
        "この画像の回答を送信";

    }

  }
);


// 初期化
async function init() {

  try {

    // 回答者IDを取得
    respondentId =
      await getRespondentId();


    // GitHubから画像一覧を取得
    const allImages =
      await getImages();


    // 指定画像が5枚存在するか確認
    const byName = new Map(
      allImages.map(
        item => [item.name, item]
      )
    );


    images = TARGET_IMAGES
      .map(name => byName.get(name))
      .filter(Boolean);


    if (
      images.length !==
      TARGET_IMAGES.length
    ) {

      throw new Error(
        "指定した画像の一部がGitHubのimagesフォルダに見つかりません。"
      );

    }


    // 指定画像の順番を保存
    localStorage.setItem(
      IMAGES_KEY,
      JSON.stringify(
        images.map(item => item.name)
      )
    );


    // 保存されている回答を読み込む
    const savedAnswers =
      JSON.parse(
        localStorage.getItem(
          ANSWERS_KEY
        ) || "[]"
      );


    // 現在の画像番号を読み込む
    const savedIndex =
      Number(
        localStorage.getItem(
          INDEX_KEY
        ) || "0"
      );


    answers =
      Array.isArray(savedAnswers)
        ? savedAnswers
        : [];


    currentIndex =
      Number.isInteger(savedIndex) &&
      savedIndex >= 0
        ? savedIndex
        : 0;


    statusEl.hidden = true;

    surveyEl.hidden = false;


    // 最初の画像を表示
    renderCurrentImage();


  } catch (error) {

    showError(
      error.message ||
      "読み込み中にエラーが発生しました。"
    );

    console.error(error);

  }

}


// アンケート開始
init();
```
