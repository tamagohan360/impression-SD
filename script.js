
const GITHUB_USER = "tamagohan360";
const REPOSITORY = "impression-SD";
const IMAGE_FOLDER = "images";

const GAS_URL =
  "https://script.google.com/macros/s/AKfycby-cBshtQaIloNtTn-qkV2XBin0IwqbOpJ-cG87Vm18GUTPTcjVS1Z3ZkgakLdJKYjQ/exec";

const IMAGE_COUNT = 5;

// 左側を1、右側を7として記録する
const scales = [
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

const loading = document.getElementById("loading");
const error = document.getElementById("error");
const questions = document.getElementById("questions");
const submitButton = document.getElementById("submitButton");
const message = document.getElementById("message");

let selectedImages = [];
let respondentId = "";

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

async function getRespondentId() {
  const savedId = localStorage.getItem("clothingSurveyRespondentId");

  if (savedId) {
    return savedId;
  }

  const response = await fetch(GAS_URL);
  const data = await response.json();

  if (!data.respondentId) {
    throw new Error("回答者IDを取得できませんでした。");
  }

  localStorage.setItem(
    "clothingSurveyRespondentId",
    data.respondentId
  );

  return data.respondentId;
}

async function getImages() {
  const apiUrl =
    `https://api.github.com/repos/${GITHUB_USER}/${REPOSITORY}/contents/${IMAGE_FOLDER}`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error("GitHubから画像一覧を取得できませんでした。");
  }

  const files = await response.json();

  return files.filter(file =>
    file.type === "file" &&
    /\.(jpg|jpeg|png|webp)$/i.test(file.name)
  );
}

function createQuestion(image, imageIndex) {
  const card = document.createElement("section");
  card.className = "question-card";

  const heading = document.createElement("h2");
  heading.textContent = `画像 ${imageIndex + 1} / ${IMAGE_COUNT}`;
  card.appendChild(heading);

  const img = document.createElement("img");
  img.src = image.download_url;
  img.alt = `評価対象の服の画像 ${imageIndex + 1}`;
  img.loading = "lazy";
  card.appendChild(img);

  scales.forEach(([left, right], scaleIndex) => {
    const row = document.createElement("div");
    row.className = "scale-item";

    const leftLabel = document.createElement("div");
    leftLabel.className = "scale-label left";
    leftLabel.textContent = left;

    const rightLabel = document.createElement("div");
    rightLabel.className = "scale-label right";
    rightLabel.textContent = right;

    const options = document.createElement("div");
    options.className = "options";

    for (let value = 1; value <= 7; value++) {
      const label = document.createElement("label");
      label.className = "option";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `image${imageIndex}_scale${scaleIndex}`;
      radio.value = String(value);
      radio.required = true;

      const number = document.createElement("span");
      number.textContent = String(value);

      label.appendChild(radio);
      label.appendChild(number);
      options.appendChild(label);
    }

    row.appendChild(leftLabel);
    row.appendChild(options);
    row.appendChild(rightLabel);
    card.appendChild(row);
  });

  return card;
}

function renderQuestions(images) {
  questions.replaceChildren();

  selectedImages = shuffle(images).slice(0, IMAGE_COUNT);

  selectedImages.forEach((image, index) => {
    questions.appendChild(createQuestion(image, index));
  });

  submitButton.hidden = false;
}

function collectAnswers() {
  return selectedImages.map((image, imageIndex) => {
    const scores = scales.map((_, scaleIndex) => {
      const selected = document.querySelector(
        `input[name="image${imageIndex}_scale${scaleIndex}"]:checked`
      );

      return selected ? Number(selected.value) : null;
    });

    return {
      image: image.name,
      scores
    };
  });
}

submitButton.addEventListener("click", async () => {
  const answers = collectAnswers();

  const incomplete = answers.some(answer =>
    answer.scores.some(score => score === null)
  );

  if (incomplete) {
    message.textContent = "すべての項目に回答してください。";
    return;
  }

  submitButton.disabled = true;
  message.textContent = "回答を送信しています...";

  const payload = {
    respondentId,
    answers
  };

  try {
    // no-corsではサーバーからの保存結果を読み取れない。
    // 送信処理を開始したことと、保存成功は区別する。
    await fetch(GAS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    message.textContent =
      "送信処理を行いました。回答が保存されたか確認できない場合は、管理者にお問い合わせください。";
    questions.replaceChildren();
    submitButton.hidden = true;
  } catch (e) {
    console.error(e);
    message.textContent =
      "送信に失敗しました。通信環境を確認して、もう一度お試しください。";
    submitButton.disabled = false;
  }
});

async function initialize() {
  try {
    respondentId = await getRespondentId();

    const images = await getImages();

    if (images.length < IMAGE_COUNT) {
      throw new Error(
        `画像が${IMAGE_COUNT}枚以上必要です。現在は${images.length}枚です。`
      );
    }

    renderQuestions(images);
    loading.hidden = true;
  } catch (e) {
    console.error(e);
    loading.hidden = true;
    error.textContent = e.message;
  }
}

initialize();
