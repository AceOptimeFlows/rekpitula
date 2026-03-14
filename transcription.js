(function () {
  'use strict';

  const APP_KEY = 'ReKPiTu';
  const LANG_KEY = APP_KEY + ':lang';
  const MODE_KEY = APP_KEY + ':transcriber:mode:v1';
  const MODEL_FLAG_KEY = APP_KEY + ':whisper:model:v1';
  const MODEL_CACHE_NAME = 'rekpitu-whisper-model-v1';
  const RUNTIME_CACHE_NAME = 'rekpitu-whisper-runtime-v3';
  const LEGACY_MODEL_CACHES = ['transformers-cache', 'transformers-cache-v1'];
  const LEGACY_RUNTIME_CACHES = ['rekpitu-whisper-runtime-v1', 'rekpitu-whisper-runtime-v2'];
  const MODEL_ID = 'Xenova/whisper-small';
  const TRANSFORMERS_VERSION = '3.8.1';
  const TRANSFORMERS_IMPORT_URL = `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}`;
  const TRANSFORMERS_DIST_URL = TRANSFORMERS_IMPORT_URL + '/dist/';
  const TRANSFORMERS_ENTRY_URL = TRANSFORMERS_DIST_URL + 'transformers.web.min.js';
  const TRANSFORMERS_FALLBACK_URL = TRANSFORMERS_IMPORT_URL;
  const RUNTIME_ASSET_URLS = [
    TRANSFORMERS_ENTRY_URL,
    TRANSFORMERS_DIST_URL + 'ort-wasm-simd-threaded.jsep.mjs',
    TRANSFORMERS_DIST_URL + 'ort-wasm-simd-threaded.jsep.wasm'
  ];

  const SUPPORTED_LANGS = ['es', 'en', 'pt-br', 'de', 'it', 'fr', 'ru', 'ko', 'ja', 'zh'];
  const SUPPORTED_MODES = ['whisper', 'browser'];

  const WHISPER_LANGUAGE = {
    'es': 'spanish',
    'en': 'english',
    'pt-br': 'portuguese',
    'de': 'german',
    'it': 'italian',
    'fr': 'french',
    'ru': 'russian',
    'ko': 'korean',
    'ja': 'japanese',
    'zh': 'chinese'
  };

  const BROWSER_LANG_MAP = {
    'es': 'es-ES',
    'en': 'en-US',
    'pt-br': 'pt-BR',
    'de': 'de-DE',
    'it': 'it-IT',
    'fr': 'fr-FR',
    'ru': 'ru-RU',
    'ko': 'ko-KR',
    'ja': 'ja-JP',
    'zh': 'zh-CN'
  };

  const UI_TEXT = {
    'es': {
      modeLabel: 'Motor de transcripción',
      modeWhisper: 'Whisper offline · Privacidad',
      modeBrowser: 'Navegador · Más rápido',
      modeHintWhisper: 'Máxima privacidad: audio y texto se procesan localmente tras descargar el modelo.',
      modeHintBrowser: 'Arranque más rápido: usa el motor de voz del navegador y puede depender de servicios de la plataforma o del propio navegador.',
      dictationHelpWhisper: 'Pulsa una vez para grabar. Vuelve a pulsar para que se transcriba lo grabado.',
      dictationHelpBrowser: 'Pulsa una vez para empezar a dictar. Pulsa otra vez para detener el dictado.',
      title: 'Transcriptor offline · Whisper Small',
      lead: 'Descarga el modelo una vez y luego dicta sin conexión.',
      download: 'Descargar modelo',
      delete: 'Eliminar modelo',
      statusMissing: 'Modelo no descargado.',
      statusReady: 'Modelo listo para dictado offline.',
      statusChecking: 'Comprobando modelo local…',
      statusPreparingRuntime: 'Preparando runtime local…',
      statusDownloading: 'Descargando modelo…',
      statusLoading: 'Cargando modelo local…',
      statusRecording: 'Grabando audio… pulsa de nuevo para terminar.',
      statusProcessing: 'Transcribiendo localmente…',
      statusDeleted: 'Modelo eliminado.',
      browserStatusListening: 'Dictado del navegador activo… habla ahora.',
      toastReady: 'Modelo Whisper Small listo.',
      toastDeleted: 'Modelo eliminado.',
      errModelMissing: 'Descarga primero Whisper Small desde Ajustes.',
      errMicDenied: 'Permiso de micrófono denegado.',
      errMicUnavailable: 'Micrófono no disponible.',
      errProcessing: 'No se pudo transcribir localmente.',
      errTooShort: 'No detecté suficiente voz.',
      errDownload: 'No se pudo descargar el modelo.',
      errUnsupported: 'Este navegador no soporta transcripción local offline.',
      errLibrary: 'No se pudo cargar el motor de transcripción local.'
    },
    'en': {
      modeLabel: 'Transcription engine',
      modeWhisper: 'Whisper offline · Privacy',
      modeBrowser: 'Browser · Faster',
      modeHintWhisper: 'Maximum privacy: audio and text stay on-device after the model is downloaded.',
      modeHintBrowser: 'Faster startup: uses the browser speech engine and may rely on browser or platform services.',
      dictationHelpWhisper: 'Press once to record. Press again to transcribe what was recorded.',
      dictationHelpBrowser: 'Press once to start browser dictation. Press again to stop it.',
      title: 'Offline transcriber · Whisper Small',
      lead: 'Download the model once, then dictate offline.',
      download: 'Download model',
      delete: 'Delete model',
      statusMissing: 'Model not downloaded.',
      statusReady: 'Model ready for offline dictation.',
      statusChecking: 'Checking local model…',
      statusPreparingRuntime: 'Preparing local runtime…',
      statusDownloading: 'Downloading model…',
      statusLoading: 'Loading local model…',
      statusRecording: 'Recording audio… press again to finish.',
      statusProcessing: 'Transcribing locally…',
      statusDeleted: 'Model deleted.',
      browserStatusListening: 'Browser dictation is active… speak now.',
      toastReady: 'Whisper Small model ready.',
      toastDeleted: 'Model deleted.',
      errModelMissing: 'Download Whisper Small from Settings first.',
      errMicDenied: 'Microphone permission denied.',
      errMicUnavailable: 'Microphone unavailable.',
      errProcessing: 'Local transcription failed.',
      errTooShort: 'I could not detect enough speech.',
      errDownload: 'Model download failed.',
      errUnsupported: 'This browser does not support local offline transcription.',
      errLibrary: 'Could not load the local transcription engine.'
    },
    'pt-br': {
      modeLabel: 'Motor de transcrição',
      modeWhisper: 'Whisper offline · Privacidade',
      modeBrowser: 'Navegador · Mais rápido',
      modeHintWhisper: 'Privacidade máxima: áudio e texto são processados localmente após o download do modelo.',
      modeHintBrowser: 'Inicialização mais rápida: usa o motor de voz do navegador e pode depender de serviços da plataforma ou do próprio navegador.',
      dictationHelpWhisper: 'Pressione uma vez para gravar. Pressione novamente para transcrever o que foi gravado.',
      dictationHelpBrowser: 'Pressione uma vez para começar o ditado do navegador. Pressione novamente para parar.',
      title: 'Transcritor offline · Whisper Small',
      lead: 'Baixe o modelo uma vez e depois dite sem conexão.',
      download: 'Baixar modelo',
      delete: 'Excluir modelo',
      statusMissing: 'Modelo não baixado.',
      statusReady: 'Modelo pronto para ditado offline.',
      statusChecking: 'Verificando modelo local…',
      statusPreparingRuntime: 'Preparando runtime local…',
      statusDownloading: 'Baixando modelo…',
      statusLoading: 'Carregando modelo local…',
      statusRecording: 'Gravando áudio… pressione novamente para terminar.',
      statusProcessing: 'Transcrevendo localmente…',
      statusDeleted: 'Modelo removido.',
      browserStatusListening: 'Ditado do navegador ativo… fale agora.',
      toastReady: 'Modelo Whisper Small pronto.',
      toastDeleted: 'Modelo removido.',
      errModelMissing: 'Baixe primeiro o Whisper Small em Ajustes.',
      errMicDenied: 'Permissão do microfone negada.',
      errMicUnavailable: 'Microfone indisponível.',
      errProcessing: 'A transcrição local falhou.',
      errTooShort: 'Não detectei voz suficiente.',
      errDownload: 'Não foi possível baixar o modelo.',
      errUnsupported: 'Este navegador não suporta transcrição offline local.',
      errLibrary: 'Não foi possível carregar o motor de transcrição local.'
    },
    'it': {
      modeLabel: 'Motore di trascrizione',
      modeWhisper: 'Whisper offline · Privacy',
      modeBrowser: 'Browser · Più veloce',
      modeHintWhisper: 'Massima privacy: audio e testo vengono elaborati localmente dopo il download del modello.',
      modeHintBrowser: 'Avvio più rapido: usa il motore vocale del browser e può dipendere da servizi del browser o della piattaforma.',
      dictationHelpWhisper: 'Premi una volta per registrare. Premi di nuovo per trascrivere ciò che è stato registrato.',
      dictationHelpBrowser: 'Premi una volta per avviare il dettato del browser. Premi di nuovo per fermarlo.',
      title: 'Trascrittore offline · Whisper Small',
      lead: 'Scarica il modello una volta e poi detta offline.',
      download: 'Scarica modello',
      delete: 'Elimina modello',
      statusMissing: 'Modello non scaricato.',
      statusReady: 'Modello pronto per dettatura offline.',
      statusChecking: 'Verifica del modello locale…',
      statusPreparingRuntime: 'Preparazione del runtime locale…',
      statusDownloading: 'Download del modello…',
      statusLoading: 'Caricamento del modello locale…',
      statusRecording: 'Registrazione audio… premi di nuovo per terminare.',
      statusProcessing: 'Trascrizione locale in corso…',
      statusDeleted: 'Modello eliminato.',
      browserStatusListening: 'Dettatura del browser attiva… parla ora.',
      toastReady: 'Modello Whisper Small pronto.',
      toastDeleted: 'Modello eliminato.',
      errModelMissing: 'Scarica prima Whisper Small dalle Impostazioni.',
      errMicDenied: 'Permesso microfono negato.',
      errMicUnavailable: 'Microfono non disponibile.',
      errProcessing: 'Trascrizione locale non riuscita.',
      errTooShort: 'Non ho rilevato abbastanza voce.',
      errDownload: 'Impossibile scaricare il modello.',
      errUnsupported: 'Questo browser non supporta la trascrizione offline locale.',
      errLibrary: 'Impossibile caricare il motore di trascrizione locale.'
    },
    'fr': {
      modeLabel: 'Moteur de transcription',
      modeWhisper: 'Whisper hors ligne · Confidentialité',
      modeBrowser: 'Navigateur · Plus rapide',
      modeHintWhisper: 'Confidentialité maximale : l’audio et le texte restent traités localement après le téléchargement du modèle.',
      modeHintBrowser: 'Démarrage plus rapide : utilise le moteur vocal du navigateur et peut dépendre des services du navigateur ou de la plateforme.',
      dictationHelpWhisper: 'Appuyez une fois pour enregistrer. Appuyez de nouveau pour transcrire ce qui a été enregistré.',
      dictationHelpBrowser: 'Appuyez une fois pour lancer la dictée du navigateur. Appuyez de nouveau pour l’arrêter.',
      title: 'Transcripteur hors ligne · Whisper Small',
      lead: 'Téléchargez le modèle une fois puis dictez hors ligne.',
      download: 'Télécharger le modèle',
      delete: 'Supprimer le modèle',
      statusMissing: 'Modèle non téléchargé.',
      statusReady: 'Modèle prêt pour la dictée hors ligne.',
      statusChecking: 'Vérification du modèle local…',
      statusPreparingRuntime: 'Préparation du runtime local…',
      statusDownloading: 'Téléchargement du modèle…',
      statusLoading: 'Chargement du modèle local…',
      statusRecording: 'Enregistrement audio… appuyez de nouveau pour terminer.',
      statusProcessing: 'Transcription locale en cours…',
      statusDeleted: 'Modèle supprimé.',
      browserStatusListening: 'Dictée du navigateur active… parlez maintenant.',
      toastReady: 'Modèle Whisper Small prêt.',
      toastDeleted: 'Modèle supprimé.',
      errModelMissing: 'Téléchargez d’abord Whisper Small depuis Réglages.',
      errMicDenied: 'Autorisation micro refusée.',
      errMicUnavailable: 'Microphone indisponible.',
      errProcessing: 'Échec de la transcription locale.',
      errTooShort: 'Je n’ai pas détecté assez de voix.',
      errDownload: 'Impossible de télécharger le modèle.',
      errUnsupported: 'Ce navigateur ne prend pas en charge la transcription locale hors ligne.',
      errLibrary: 'Impossible de charger le moteur de transcription local.'
    },
    'de': {
      modeLabel: 'Transkriptions-Engine',
      modeWhisper: 'Whisper offline · Datenschutz',
      modeBrowser: 'Browser · Schneller',
      modeHintWhisper: 'Maximale Privatsphäre: Audio und Text werden nach dem Download des Modells lokal verarbeitet.',
      modeHintBrowser: 'Schnellerer Start: nutzt die Spracheingabe des Browsers und kann von Browser- oder Plattformdiensten abhängen.',
      dictationHelpWhisper: 'Einmal drücken, um aufzunehmen. Noch einmal drücken, um das Aufgenommene zu transkribieren.',
      dictationHelpBrowser: 'Einmal drücken, um das Browser-Diktat zu starten. Noch einmal drücken, um es zu stoppen.',
      title: 'Offline-Transkription · Whisper Small',
      lead: 'Lade das Modell einmal herunter und diktiere danach offline.',
      download: 'Modell herunterladen',
      delete: 'Modell löschen',
      statusMissing: 'Modell nicht heruntergeladen.',
      statusReady: 'Modell für Offline-Diktat bereit.',
      statusChecking: 'Lokales Modell wird geprüft…',
      statusPreparingRuntime: 'Lokale Laufzeit wird vorbereitet…',
      statusDownloading: 'Modell wird heruntergeladen…',
      statusLoading: 'Lokales Modell wird geladen…',
      statusRecording: 'Audio wird aufgenommen… erneut drücken zum Beenden.',
      statusProcessing: 'Lokale Transkription läuft…',
      statusDeleted: 'Modell gelöscht.',
      browserStatusListening: 'Browser-Diktat ist aktiv… jetzt sprechen.',
      toastReady: 'Whisper-Small-Modell ist bereit.',
      toastDeleted: 'Modell gelöscht.',
      errModelMissing: 'Lade zuerst Whisper Small in den Einstellungen herunter.',
      errMicDenied: 'Mikrofonberechtigung verweigert.',
      errMicUnavailable: 'Mikrofon nicht verfügbar.',
      errProcessing: 'Lokale Transkription fehlgeschlagen.',
      errTooShort: 'Ich konnte nicht genug Sprache erkennen.',
      errDownload: 'Das Modell konnte nicht heruntergeladen werden.',
      errUnsupported: 'Dieser Browser unterstützt keine lokale Offline-Transkription.',
      errLibrary: 'Die lokale Transkriptions-Engine konnte nicht geladen werden.'
    },
    'ru': {
      modeLabel: 'Движок транскрипции',
      modeWhisper: 'Whisper офлайн · Приватность',
      modeBrowser: 'Браузер · Быстрее',
      modeHintWhisper: 'Максимальная приватность: после загрузки модели аудио и текст обрабатываются локально.',
      modeHintBrowser: 'Более быстрый запуск: используется речевой движок браузера, который может зависеть от сервисов браузера или платформы.',
      dictationHelpWhisper: 'Нажмите один раз, чтобы записать. Нажмите ещё раз, чтобы расшифровать записанное.',
      dictationHelpBrowser: 'Нажмите один раз, чтобы запустить диктовку браузера. Нажмите ещё раз, чтобы остановить её.',
      title: 'Офлайн‑транскриптор · Whisper Small',
      lead: 'Скачайте модель один раз и затем диктуйте без интернета.',
      download: 'Скачать модель',
      delete: 'Удалить модель',
      statusMissing: 'Модель не скачана.',
      statusReady: 'Модель готова для офлайн‑диктовки.',
      statusChecking: 'Проверка локальной модели…',
      statusPreparingRuntime: 'Подготовка локального runtime…',
      statusDownloading: 'Загрузка модели…',
      statusLoading: 'Загрузка локальной модели…',
      statusRecording: 'Идёт запись… нажмите ещё раз, чтобы завершить.',
      statusProcessing: 'Локальная расшифровка…',
      statusDeleted: 'Модель удалена.',
      browserStatusListening: 'Диктовка браузера активна… говорите сейчас.',
      toastReady: 'Модель Whisper Small готова.',
      toastDeleted: 'Модель удалена.',
      errModelMissing: 'Сначала скачайте Whisper Small в настройках.',
      errMicDenied: 'Доступ к микрофону запрещён.',
      errMicUnavailable: 'Микрофон недоступен.',
      errProcessing: 'Не удалось выполнить локальную расшифровку.',
      errTooShort: 'Недостаточно речи для распознавания.',
      errDownload: 'Не удалось скачать модель.',
      errUnsupported: 'Этот браузер не поддерживает локальную офлайн‑транскрипцию.',
      errLibrary: 'Не удалось загрузить локальный движок транскрипции.'
    },
    'ko': {
      modeLabel: '전사 엔진',
      modeWhisper: 'Whisper 오프라인 · 개인정보 보호',
      modeBrowser: '브라우저 · 더 빠름',
      modeHintWhisper: '최대한의 개인정보 보호: 모델을 다운로드한 뒤 오디오와 텍스트가 기기에서 로컬 처리됩니다.',
      modeHintBrowser: '더 빠르게 시작되지만 브라우저 음성 엔진을 사용하며 브라우저 또는 플랫폼 서비스에 의존할 수 있습니다.',
      dictationHelpWhisper: '한 번 눌러 녹음하세요. 다시 누르면 녹음한 내용을 전사합니다.',
      dictationHelpBrowser: '한 번 눌러 브라우저 받아쓰기를 시작하세요. 다시 누르면 중지됩니다.',
      title: '오프라인 전사기 · Whisper Small',
      lead: '모델을 한 번 다운로드하면 이후에는 오프라인으로 받아쓸 수 있습니다.',
      download: '모델 다운로드',
      delete: '모델 삭제',
      statusMissing: '모델이 다운로드되지 않았습니다.',
      statusReady: '오프라인 받아쓰기를 위한 모델 준비 완료.',
      statusChecking: '로컬 모델 확인 중…',
      statusPreparingRuntime: '로컬 런타임 준비 중…',
      statusDownloading: '모델 다운로드 중…',
      statusLoading: '로컬 모델 로딩 중…',
      statusRecording: '오디오 녹음 중… 다시 누르면 종료됩니다.',
      statusProcessing: '로컬에서 전사 중…',
      statusDeleted: '모델이 삭제되었습니다.',
      browserStatusListening: '브라우저 받아쓰기가 활성화되었습니다… 지금 말씀하세요.',
      toastReady: 'Whisper Small 모델이 준비되었습니다.',
      toastDeleted: '모델이 삭제되었습니다.',
      errModelMissing: '먼저 설정에서 Whisper Small 모델을 다운로드하세요.',
      errMicDenied: '마이크 권한이 거부되었습니다.',
      errMicUnavailable: '마이크를 사용할 수 없습니다.',
      errProcessing: '로컬 전사에 실패했습니다.',
      errTooShort: '충분한 음성을 감지하지 못했습니다.',
      errDownload: '모델을 다운로드할 수 없습니다.',
      errUnsupported: '이 브라우저는 로컬 오프라인 전사를 지원하지 않습니다.',
      errLibrary: '로컬 전사 엔진을 불러올 수 없습니다.'
    },
    'ja': {
      modeLabel: '文字起こしエンジン',
      modeWhisper: 'Whisper オフライン · プライバシー重視',
      modeBrowser: 'ブラウザ · 高速',
      modeHintWhisper: '最大限のプライバシー: モデルをダウンロードした後は音声もテキストも端末上でローカル処理されます。',
      modeHintBrowser: '起動は速いですが、ブラウザの音声エンジンを使うため、ブラウザやプラットフォームのサービスに依存する場合があります。',
      dictationHelpWhisper: '1回押して録音し、もう1回押すと録音内容を文字起こしします。',
      dictationHelpBrowser: '1回押してブラウザ音声入力を開始し、もう1回押すと停止します。',
      title: 'オフライン文字起こし · Whisper Small',
      lead: 'モデルを一度ダウンロードすると、その後はオフラインで音声入力できます。',
      download: 'モデルをダウンロード',
      delete: 'モデルを削除',
      statusMissing: 'モデルはまだダウンロードされていません。',
      statusReady: 'オフライン音声入力の準備ができました。',
      statusChecking: 'ローカルモデルを確認中…',
      statusPreparingRuntime: 'ローカルランタイムを準備中…',
      statusDownloading: 'モデルをダウンロード中…',
      statusLoading: 'ローカルモデルを読み込み中…',
      statusRecording: '音声を録音中… もう一度押すと終了します。',
      statusProcessing: 'ローカルで文字起こし中…',
      statusDeleted: 'モデルを削除しました。',
      browserStatusListening: 'ブラウザ音声入力が有効です… 話してください。',
      toastReady: 'Whisper Small モデルの準備ができました。',
      toastDeleted: 'モデルを削除しました。',
      errModelMissing: '先に設定から Whisper Small をダウンロードしてください。',
      errMicDenied: 'マイクの許可が拒否されました。',
      errMicUnavailable: 'マイクを利用できません。',
      errProcessing: 'ローカル文字起こしに失敗しました。',
      errTooShort: '十分な音声を検出できませんでした。',
      errDownload: 'モデルをダウンロードできませんでした。',
      errUnsupported: 'このブラウザはローカルのオフライン文字起こしに対応していません。',
      errLibrary: 'ローカル文字起こしエンジンを読み込めませんでした。'
    },
    'zh': {
      modeLabel: '转写引擎',
      modeWhisper: 'Whisper 离线 · 隐私优先',
      modeBrowser: '浏览器 · 更快',
      modeHintWhisper: '最高隐私：下载模型后，音频和文本都会在本机本地处理。',
      modeHintBrowser: '启动更快：使用浏览器语音引擎，可能依赖浏览器或平台服务。',
      dictationHelpWhisper: '按一次开始录音，再按一次即可转写刚才录下的内容。',
      dictationHelpBrowser: '按一次开始浏览器听写，再按一次即可停止。',
      title: '离线转写 · Whisper Small',
      lead: '模型只需下载一次，之后即可离线听写。',
      download: '下载模型',
      delete: '删除模型',
      statusMissing: '模型尚未下载。',
      statusReady: '模型已可用于离线听写。',
      statusChecking: '正在检查本地模型…',
      statusPreparingRuntime: '正在准备本地运行时…',
      statusDownloading: '正在下载模型…',
      statusLoading: '正在加载本地模型…',
      statusRecording: '正在录音… 再按一次即可结束。',
      statusProcessing: '正在本地转写…',
      statusDeleted: '模型已删除。',
      browserStatusListening: '浏览器听写已开启… 现在请说话。',
      toastReady: 'Whisper Small 模型已就绪。',
      toastDeleted: '模型已删除。',
      errModelMissing: '请先在设置中下载 Whisper Small。',
      errMicDenied: '麦克风权限被拒绝。',
      errMicUnavailable: '麦克风不可用。',
      errProcessing: '本地转写失败。',
      errTooShort: '未检测到足够的语音。',
      errDownload: '无法下载模型。',
      errUnsupported: '此浏览器不支持本地离线转写。',
      errLibrary: '无法加载本地转写引擎。'
    }
  };

  let hfModulePromise = null;
  let transcriberPromise = null;
  let transcriberInstance = null;
  let envConfigured = false;
  let whisperActiveSession = null;
  let whisperSessionSeq = 0;
  let activeBackend = null;

  let browserRecognition = null;
  let browserActiveSessionId = 0;
  let browserActiveTarget = null;
  let browserActiveHintEl = null;
  let browserActiveOptions = null;
  let browserBaseValue = '';
  let browserLastRenderedValue = '';

  let uiState = { kind: 'checking', extra: '', progress: null };
  let settingsReady = false;
  let settingsWired = false;
  let dom = null;

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  }

  function safeRemove(key) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }

  function normalizeLang(raw) {
    if (window.i18n && typeof window.i18n.normalizeLang === 'function') {
      const n = window.i18n.normalizeLang(raw);
      if (n) return n;
    }

    const s = String(raw || document.documentElement.lang || '').trim().toLowerCase().replace(/_/g, '-');
    if (!s) return 'es';
    if (SUPPORTED_LANGS.includes(s)) return s;

    const primary = s.split('-')[0];
    if (SUPPORTED_LANGS.includes(primary)) return primary;
    if (primary === 'pt') return 'pt-br';
    if (primary === 'zh') return 'zh';
    return 'es';
  }

  function currentLang() {
    return normalizeLang(safeGet(LANG_KEY) || document.documentElement.lang || 'es');
  }

  function normalizeMode(raw) {
    const mode = String(raw || '').trim().toLowerCase();
    return SUPPORTED_MODES.includes(mode) ? mode : 'whisper';
  }

  function currentMode() {
    return normalizeMode(safeGet(MODE_KEY) || 'whisper');
  }

  function L(key, requestedLang) {
    const lang = normalizeLang(requestedLang || currentLang());
    const dict = UI_TEXT[lang] || UI_TEXT.en;
    return dict[key] || UI_TEXT.en[key] || key;
  }

  function T(key) {
    try {
      if (window.i18n && typeof window.i18n.t === 'function') {
        return window.i18n.t(key) || '';
      }
    } catch {
      /* ignore */
    }
    return '';
  }

  function TX(i18nKey, fallbackKey, requestedLang) {
    const translated = T(i18nKey);
    return translated || L(fallbackKey, requestedLang);
  }

  function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = String(msg || '');
    el.classList.add('is-show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      el.classList.remove('is-show');
    }, 2600);
  }

  function browserTranscriptionSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition || null);
  }

  function whisperTranscriptionSupported() {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    return !!(
      window.isSecureContext &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      AudioContextCtor &&
      typeof Float32Array !== 'undefined' &&
      typeof Promise !== 'undefined'
    );
  }

  function isSupported(mode) {
    const selected = normalizeMode(mode || currentMode());
    return selected === 'browser' ? browserTranscriptionSupported() : whisperTranscriptionSupported();
  }

  function getErrorMessage(code, requestedLang) {
    const map = {
      'model-missing': 'errModelMissing',
      'not-allowed': 'errMicDenied',
      'service-not-allowed': 'errMicDenied',
      'audio-capture': 'errMicUnavailable',
      'no-speech': 'errTooShort',
      'too-short': 'errTooShort',
      'download-failed': 'errDownload',
      'processing-failed': 'errProcessing',
      'start-failed': 'errProcessing',
      'unsupported': 'errUnsupported',
      'library-load-failed': 'errLibrary',
      'model-load-failed': 'errLibrary'
    };
    const key = map[code];
    return key ? (T('transcription.' + key) || L(key, requestedLang)) : '';
  }

  function classifyError(err, fallbackCode) {
    if (err && err.code) return err.code;

    const msg = String((err && (err.message || err.name)) || '').toLowerCase();
    if (!msg) return fallbackCode || 'processing-failed';

    if (msg.includes('notallowed') || msg.includes('permission') || msg.includes('security')) return 'not-allowed';
    if (msg.includes('microphone') || msg.includes('getusermedia') || msg.includes('audio context')) return 'audio-capture';
    if (msg.includes('dynamically imported module') || msg.includes('import') || msg.includes('module script')) return 'library-load-failed';
    if (msg.includes('failed to fetch') || msg.includes('download') || msg.includes('network')) return 'download-failed';

    return fallbackCode || 'processing-failed';
  }

  function getWhisperLanguage(appLang) {
    return WHISPER_LANGUAGE[normalizeLang(appLang)] || 'spanish';
  }

  function resolveBrowserRecognitionLang(appLang) {
    const n = normalizeLang(appLang);
    return BROWSER_LANG_MAP[n] || 'es-ES';
  }

  function setHint(el, text) {
    if (!el) return;
    el.textContent = String(text || '');
  }

  function safeFocus(el) {
    if (!el || typeof el.focus !== 'function') return;
    try {
      el.focus({ preventScroll: true });
    } catch {
      try { el.focus(); } catch { /* ignore */ }
    }
  }

  function isTextField(el) {
    return !!(
      el &&
      typeof el.value === 'string' &&
      typeof el.focus === 'function' &&
      !el.disabled &&
      !el.readOnly
    );
  }

  function cleanText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function appendWithSeparator(existing, addition) {
    const left = String(existing || '');
    const right = cleanText(addition);
    if (!right) return left;
    if (!left) return right;
    const sep = /[\s\n]$/.test(left) ? '' : ' ';
    return left + sep + right;
  }

  function renderToTarget(target, value) {
    if (!target || typeof value !== 'string') return;
    target.value = value;
    try {
      const len = target.value.length;
      target.setSelectionRange(len, len);
    } catch {
      /* ignore */
    }
    if ('scrollTop' in target && 'scrollHeight' in target) {
      target.scrollTop = target.scrollHeight;
    }
  }

  function mergeFloat32(chunks) {
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const out = new Float32Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }

  function downsampleBuffer(input, inputRate, outputRate) {
    if (!(input instanceof Float32Array)) input = new Float32Array(input || []);
    if (!input.length) return new Float32Array(0);
    if (!inputRate || inputRate <= 0 || inputRate === outputRate) return input.slice();

    const ratio = inputRate / outputRate;
    const newLength = Math.max(1, Math.round(input.length / ratio));
    const result = new Float32Array(newLength);
    let offsetBuffer = 0;

    for (let i = 0; i < newLength; i++) {
      const nextOffsetBuffer = Math.min(input.length, Math.round((i + 1) * ratio));
      let accum = 0;
      let count = 0;
      for (let j = offsetBuffer; j < nextOffsetBuffer; j++) {
        accum += input[j];
        count += 1;
      }
      result[i] = count ? (accum / count) : 0;
      offsetBuffer = nextOffsetBuffer;
    }

    return result;
  }

  function trimSilence(input, sampleRate) {
    if (!(input instanceof Float32Array) || !input.length) return new Float32Array(0);

    const threshold = 0.008;
    const padding = Math.max(0, Math.floor((sampleRate || 16000) * 0.18));
    let start = 0;
    let end = input.length - 1;

    while (start < input.length && Math.abs(input[start]) < threshold) start += 1;
    while (end > start && Math.abs(input[end]) < threshold) end -= 1;

    if (start >= end) return new Float32Array(0);

    start = Math.max(0, start - padding);
    end = Math.min(input.length, end + padding);
    return input.slice(start, end);
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (!Number.isFinite(value) || value <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = value;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    const digits = size >= 100 ? 0 : size >= 10 ? 1 : 2;
    return `${size.toFixed(digits)} ${units[unit]}`;
  }

  function clampProgress(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(100, n));
  }

  async function requestPersistentStorage() {
    try {
      if (navigator.storage && typeof navigator.storage.persist === 'function') {
        await navigator.storage.persist();
      }
    } catch {
      /* ignore */
    }
  }

  async function openModelCache() {
    if (!('caches' in window)) return null;
    try {
      return await caches.open(MODEL_CACHE_NAME);
    } catch {
      return null;
    }
  }

  async function openRuntimeCache() {
    if (!('caches' in window)) return null;
    try {
      return await caches.open(RUNTIME_CACHE_NAME);
    } catch {
      return null;
    }
  }

  function isModelCacheUrl(url) {
    const s = String(url || '');
    return s.includes('/Xenova/whisper-small/') || s.includes('/Xenova%2Fwhisper-small/');
  }

  async function hasCachedModel() {
    if (transcriberInstance || transcriberPromise) return true;

    const cache = await openModelCache();
    if (cache) {
      try {
        const keys = await cache.keys();
        return keys.some((req) => isModelCacheUrl(req.url));
      } catch {
        return false;
      }
    }

    return safeGet(MODEL_FLAG_KEY) === 'ready';
  }

  async function hasCachedRuntime() {
    if (!('caches' in window)) return false;
    try {
      for (const url of RUNTIME_ASSET_URLS) {
        const match = await caches.match(url, { ignoreSearch: true });
        if (!match) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async function hasWhisperAssets() {
    const [modelReady, runtimeReady] = await Promise.all([
      hasCachedModel(),
      hasCachedRuntime()
    ]);
    return modelReady && runtimeReady;
  }

  async function putRuntimeResponse(url, response) {
    if (!response || !(response.ok || response.type === 'opaque')) return false;
    const cache = await openRuntimeCache();
    if (!cache) return false;
    await cache.put(url, response.clone());
    return true;
  }

  async function ensureRuntimeCached() {
    const cacheApiAvailable = 'caches' in window;
    if (!cacheApiAvailable) return false;

    const missing = [];
    for (const url of RUNTIME_ASSET_URLS) {
      try {
        const cached = await caches.match(url, { ignoreSearch: true });
        if (!cached) missing.push(url);
      } catch {
        missing.push(url);
      }
    }

    if (!missing.length) return true;

    setUiState('preparingRuntime');

    for (const url of missing) {
      const response = await fetch(url, { cache: 'reload' });
      if (!(response && (response.ok || response.type === 'opaque'))) {
        throw Object.assign(new Error('Runtime download failed'), { code: 'download-failed' });
      }
      await putRuntimeResponse(url, response);
    }

    return true;
  }

  async function configureEnv(hf) {
    if (!hf || !hf.env) return;
    if (envConfigured) return;

    const env = hf.env;
    env.allowLocalModels = false;
    env.allowRemoteModels = true;
    env.useBrowserCache = false;
    env.useCustomCache = false;

    const customCache = await openModelCache();
    if (customCache) {
      env.useCustomCache = true;
      env.customCache = customCache;
    } else {
      env.useBrowserCache = true;
    }

    try {
      if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
        env.backends.onnx.wasm.wasmPaths = TRANSFORMERS_DIST_URL;
      }
    } catch {
      /* ignore */
    }

    if (typeof env.useWasmCache === 'boolean') {
      env.useWasmCache = true;
    }

    envConfigured = true;
  }

  async function getHFModule() {
    if (hfModulePromise) return hfModulePromise;

    hfModulePromise = (async () => {
      let lastErr = null;
      for (const url of [TRANSFORMERS_ENTRY_URL, TRANSFORMERS_FALLBACK_URL]) {
        try {
          const hf = await import(url);
          await configureEnv(hf);
          return hf;
        } catch (err) {
          lastErr = err;
        }
      }
      throw lastErr || new Error('Could not load the local transcription engine.');
    })().catch((err) => {
      hfModulePromise = null;
      throw err;
    });

    return hfModulePromise;
  }

  function updateDomRefs() {
    dom = {
      modeLabel: document.getElementById('transcriberModeLabel'),
      modeSelect: document.getElementById('transcriberModeSelect'),
      modeHelp: document.getElementById('transcriberModeHelp'),
      title: document.getElementById('whisperTitle'),
      lead: document.getElementById('whisperLead'),
      downloadBtn: document.getElementById('btnDownloadWhisper'),
      deleteBtn: document.getElementById('btnDeleteWhisper'),
      status: document.getElementById('whisperStatus'),
      progressBox: document.getElementById('whisperProgressBox'),
      progressFill: document.getElementById('whisperProgressFill'),
      progressText: document.getElementById('whisperProgressText'),
      dictationHelp: document.getElementById('dictationModeHelp'),
      commandBox: document.getElementById('commandTranscriberBox'),
      commandModeLabel: document.getElementById('commandTranscriberModeLabel'),
      commandModeSelect: document.getElementById('commandTranscriberModeSelect'),
      commandWhisperState: document.getElementById('commandWhisperState'),
      commandDownloadBtn: document.getElementById('btnDownloadWhisperInline'),
      commandProgressBox: document.getElementById('commandWhisperProgressBox'),
      commandProgressFill: document.getElementById('commandWhisperProgressFill'),
      commandProgressText: document.getElementById('commandWhisperProgressText')
    };
    settingsReady = !!(dom && dom.modeSelect && dom.downloadBtn && dom.deleteBtn && dom.status);
  }

  function describeUiState(kind) {
    return {
      checking: TX('transcription.statusChecking', 'statusChecking'),
      missing: TX('transcription.statusMissing', 'statusMissing'),
      ready: TX('transcription.statusReady', 'statusReady'),
      preparingRuntime: TX('transcription.statusPreparingRuntime', 'statusPreparingRuntime'),
      downloading: TX('transcription.statusDownloading', 'statusDownloading'),
      loading: TX('transcription.statusLoading', 'statusLoading'),
      recording: TX('transcription.statusRecording', 'statusRecording'),
      processing: TX('transcription.statusProcessing', 'statusProcessing'),
      deleted: TX('transcription.statusDeleted', 'statusDeleted')
    }[kind] || '';
  }

  function commandWhisperStateText() {
    if (uiState.kind === 'preparingRuntime' || uiState.kind === 'downloading' || uiState.kind === 'loading') {
      return describeUiState(uiState.kind);
    }

    const ready = !!transcriberInstance || safeGet(MODEL_FLAG_KEY) === 'ready' || uiState.kind === 'ready';
    return ready
      ? (T('transcription.commandReady') || describeUiState('ready'))
      : (T('transcription.commandMissing') || describeUiState('missing'));
  }

  function getDictationHelpText(mode) {
    const selected = normalizeMode(mode || currentMode());
    const i18nKey = selected === 'browser' ? 'dictation.browserHelp' : 'dictation.whisperHelp';
    const translated = T(i18nKey);
    if (translated) return translated;
    return selected === 'browser' ? L('dictationHelpBrowser') : L('dictationHelpWhisper');
  }

  function setUiState(kind, extra, progress) {
    uiState = {
      kind,
      extra: String(extra || ''),
      progress: clampProgress(progress)
    };
    refreshSettingsUi();
  }

  function refreshSettingsUi() {
    updateDomRefs();
    if (!settingsReady) return;

    const mode = currentMode();
    const busy = uiState.kind === 'downloading' || uiState.kind === 'loading' || uiState.kind === 'preparingRuntime';
    const showProgress = uiState.progress !== null && (uiState.kind === 'downloading' || uiState.kind === 'loading');
    const modeLabel = TX('transcription.modeLabel', 'modeLabel');
    const modeWhisper = TX('transcription.modeWhisper', 'modeWhisper');
    const modeBrowser = TX('transcription.modeBrowser', 'modeBrowser');
    const downloadLabel = TX('transcription.download', 'download');
    const deleteLabel = TX('transcription.delete', 'delete');
    const whisperReady = !!transcriberInstance || safeGet(MODEL_FLAG_KEY) === 'ready' || uiState.kind === 'ready';

    const settingsWhisperOption = dom.modeSelect && dom.modeSelect.querySelector('option[value="whisper"]');
    const settingsBrowserOption = dom.modeSelect && dom.modeSelect.querySelector('option[value="browser"]');

    if (dom.modeLabel) dom.modeLabel.textContent = modeLabel;
    if (settingsWhisperOption) settingsWhisperOption.textContent = modeWhisper;
    if (settingsBrowserOption) settingsBrowserOption.textContent = modeBrowser;
    if (dom.modeSelect) {
      dom.modeSelect.value = mode;
      dom.modeSelect.disabled = busy;
      dom.modeSelect.setAttribute('aria-label', modeLabel);
    }

    if (dom.modeHelp) {
      dom.modeHelp.textContent = mode === 'browser'
        ? TX('transcription.modeHintBrowser', 'modeHintBrowser')
        : TX('transcription.modeHintWhisper', 'modeHintWhisper');
    }

    if (dom.dictationHelp) {
      dom.dictationHelp.textContent = getDictationHelpText(mode);
    }

    if (dom.title) dom.title.textContent = TX('transcription.title', 'title');
    if (dom.lead) dom.lead.textContent = TX('transcription.lead', 'lead');
    if (dom.downloadBtn) {
      dom.downloadBtn.textContent = downloadLabel;
      dom.downloadBtn.disabled = busy;
    }
    if (dom.deleteBtn) {
      dom.deleteBtn.textContent = deleteLabel;
      dom.deleteBtn.disabled = busy;
    }
    if (dom.status) dom.status.textContent = describeUiState(uiState.kind);

    if (dom.progressBox && dom.progressFill && dom.progressText) {
      dom.progressBox.hidden = !showProgress;
      if (showProgress) {
        dom.progressFill.style.width = `${uiState.progress}%`;
        dom.progressText.textContent = uiState.extra || `${Math.round(uiState.progress)}%`;
      }
    }

    if (dom.commandModeLabel) dom.commandModeLabel.textContent = modeLabel;
    if (dom.commandModeSelect) {
      const commandWhisperOption = dom.commandModeSelect.querySelector('option[value="whisper"]');
      const commandBrowserOption = dom.commandModeSelect.querySelector('option[value="browser"]');
      if (commandWhisperOption) commandWhisperOption.textContent = modeWhisper;
      if (commandBrowserOption) commandBrowserOption.textContent = modeBrowser;
      dom.commandModeSelect.value = mode;
      dom.commandModeSelect.disabled = busy;
      dom.commandModeSelect.setAttribute('aria-label', T('transcription.commandSelectAria') || modeLabel);
    }

    if (dom.commandDownloadBtn) {
      dom.commandDownloadBtn.textContent = T('transcription.commandDownload') || downloadLabel;
      dom.commandDownloadBtn.disabled = busy;
      dom.commandDownloadBtn.hidden = mode !== 'whisper' || showProgress || busy || whisperReady;
    }

    if (dom.commandWhisperState) {
      const showCommandState = mode === 'whisper' && !showProgress;
      dom.commandWhisperState.hidden = !showCommandState;
      if (showCommandState) {
        dom.commandWhisperState.textContent = commandWhisperStateText();
      }
    }

    if (dom.commandProgressBox && dom.commandProgressFill && dom.commandProgressText) {
      const showCommandProgress = mode === 'whisper' && showProgress;
      dom.commandProgressBox.hidden = !showCommandProgress;
      if (showCommandProgress) {
        dom.commandProgressFill.style.width = `${uiState.progress}%`;
        dom.commandProgressText.textContent = uiState.extra || `${Math.round(uiState.progress)}%`;
      }
    }
  }

  function emitError(session, code, err) {
    const opts = session && session.options ? session.options : {};
    if (typeof opts.onError === 'function') {
      try { opts.onError(code, err || null); } catch { /* ignore */ }
    }
  }

  function clearActiveBackend(name) {
    if (activeBackend === name) activeBackend = null;
  }

  function setActiveBackend(name) {
    activeBackend = name;
  }

  async function createPipeline(progressCallback) {
    const hf = await getHFModule();
    const pipe = await hf.pipeline('automatic-speech-recognition', MODEL_ID, {
      progress_callback: typeof progressCallback === 'function' ? progressCallback : undefined
    });
    return pipe;
  }

  async function ensureModelLoaded(options) {
    const opts = options || {};
    if (transcriberInstance) return transcriberInstance;
    if (transcriberPromise) return transcriberPromise;

    transcriberPromise = (async () => {
      await ensureRuntimeCached();
      setUiState(opts.progressMode === 'download' ? 'downloading' : 'loading');
      try {
        const pipe = await createPipeline((info) => {
          if (!info) return;

          if (info.status === 'progress_total' || info.status === 'progress') {
            const progress = clampProgress(info.progress);
            const label = progress === null
              ? ''
              : info.total
                ? `${Math.round(progress)}% · ${formatBytes(info.loaded)} / ${formatBytes(info.total)}`
                : `${Math.round(progress)}%`;
            setUiState(opts.progressMode === 'download' ? 'downloading' : 'loading', label, progress);
          } else if (info.status === 'ready') {
            setUiState('ready');
          }
        });

        transcriberInstance = pipe;
        safeSet(MODEL_FLAG_KEY, 'ready');
        await requestPersistentStorage();
        setUiState('ready');
        return pipe;
      } catch (err) {
        transcriberInstance = null;
        throw err;
      } finally {
        transcriberPromise = null;
      }
    })();

    return transcriberPromise;
  }

  async function downloadModel() {
    if (!whisperTranscriptionSupported()) {
      showToast(getErrorMessage('unsupported'));
      return false;
    }

    try {
      await ensureModelLoaded({ progressMode: 'download' });
      showToast(T('transcription.toastReady') || L('toastReady'));
      refreshSettingsUi();
      return true;
    } catch (err) {
      console.error('[ReKPiTu][Whisper download]', err);
      setUiState((await hasWhisperAssets()) ? 'ready' : 'missing');
      showToast(getErrorMessage(classifyError(err, 'download-failed')));
      return false;
    }
  }

  async function deleteModel() {
    stop({ cancel: true });

    transcriberInstance = null;
    transcriberPromise = null;
    safeRemove(MODEL_FLAG_KEY);

    if ('caches' in window) {
      try { await caches.delete(MODEL_CACHE_NAME); } catch { /* ignore */ }
      try { await caches.delete(RUNTIME_CACHE_NAME); } catch { /* ignore */ }
      for (const name of LEGACY_MODEL_CACHES) {
        try { await caches.delete(name); } catch { /* ignore */ }
      }
      for (const name of LEGACY_RUNTIME_CACHES) {
        try { await caches.delete(name); } catch { /* ignore */ }
      }
    }

    setUiState('deleted');
    showToast(T('transcription.toastDeleted') || L('toastDeleted'));
    setTimeout(() => setUiState('missing'), 600);
    return true;
  }

  function cleanupWhisperAudio(session) {
    if (!session) return;

    const media = session.media || {};

    try { if (media.processor) media.processor.onaudioprocess = null; } catch { /* ignore */ }
    try { if (media.source) media.source.disconnect(); } catch { /* ignore */ }
    try { if (media.processor) media.processor.disconnect(); } catch { /* ignore */ }
    try { if (media.mute) media.mute.disconnect(); } catch { /* ignore */ }

    if (media.stream) {
      try {
        for (const track of media.stream.getTracks()) {
          try { track.stop(); } catch { /* ignore */ }
        }
      } catch {
        /* ignore */
      }
    }

    if (media.ctx && typeof media.ctx.close === 'function') {
      try { media.ctx.close(); } catch { /* ignore */ }
    }

    session.media = null;
  }

  function finishWhisperSession(session, meta) {
    if (!session) return;
    if (whisperActiveSession !== session) return;

    const target = session.target;
    const hintEl = session.hintEl;
    const opts = session.options || {};

    if (target) target.removeAttribute('aria-busy');
    setHint(hintEl, '');

    whisperActiveSession = null;
    clearActiveBackend('whisper');
    void (async () => {
      setUiState((await hasWhisperAssets()) ? 'ready' : 'missing');
    })();

    if (typeof opts.onStop === 'function') {
      try { opts.onStop(meta || {}); } catch { /* ignore */ }
    }
  }

  async function processWhisperSession(session) {
    try {
      const raw = mergeFloat32(session.chunks || []);
      session.chunks = [];

      const downsampled = downsampleBuffer(raw, session.inputRate, 16000);
      const trimmed = trimSilence(downsampled, 16000);

      if (!trimmed.length || trimmed.length < 1600) {
        throw Object.assign(new Error('No speech'), { code: 'too-short' });
      }

      if (session.abortToken.cancelled || whisperActiveSession !== session) return;

      setHint(session.hintEl, L('statusLoading'));
      const pipe = await ensureModelLoaded({ progressMode: 'load' });

      if (session.abortToken.cancelled || whisperActiveSession !== session) return;

      setUiState('processing');
      setHint(session.hintEl, L('statusProcessing'));

      const result = await pipe(trimmed, {
        language: getWhisperLanguage(session.appLang),
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5
      });

      if (session.abortToken.cancelled || whisperActiveSession !== session) return;

      const text = cleanText(result && result.text ? result.text : '');
      if (!text) {
        throw Object.assign(new Error('Empty result'), { code: 'too-short' });
      }

      const nextValue = appendWithSeparator(session.target ? session.target.value : '', text);
      renderToTarget(session.target, nextValue);
      safeFocus(session.target);
      finishWhisperSession(session, { reason: 'end', target: session.target, text });
    } catch (err) {
      if (session.abortToken.cancelled || whisperActiveSession !== session) return;
      const code = classifyError(err, 'processing-failed');
      emitError(session, code, err || null);
      finishWhisperSession(session, { reason: 'error', target: session.target, error: err || null });
    }
  }

  async function whisperStart(options) {
    const opts = options || {};
    const target = opts.target;

    if (!isTextField(target)) {
      if (typeof opts.onInvalidTarget === 'function') {
        try { opts.onInvalidTarget(); } catch { /* ignore */ }
      }
      return false;
    }

    if (!whisperTranscriptionSupported()) {
      if (typeof opts.onUnsupported === 'function') {
        try { opts.onUnsupported(); } catch { /* ignore */ }
      }
      return false;
    }

    if (!(await hasCachedModel()) && !transcriberInstance && !transcriberPromise) {
      setUiState('missing');
      emitError({ options: opts }, 'model-missing');
      return false;
    }

    if (whisperActiveSession) {
      if (whisperActiveSession.target === target && whisperActiveSession.state === 'recording') {
        whisperStop();
        return false;
      }
      if (whisperActiveSession.state !== 'done') {
        whisperStop({ cancel: true });
      }
    }

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    const session = {
      id: ++whisperSessionSeq,
      state: 'starting',
      target,
      hintEl: opts.hintEl || null,
      options: opts,
      appLang: opts.appLang || currentLang(),
      abortToken: { cancelled: false },
      chunks: [],
      inputRate: 16000,
      media: null
    };

    whisperActiveSession = session;
    setActiveBackend('whisper');
    setUiState('recording');
    setHint(session.hintEl, L('statusRecording'));
    target.setAttribute('aria-busy', 'true');
    safeFocus(target);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      const ctx = new AudioContextCtor();
      try { await ctx.resume(); } catch { /* ignore */ }

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      const mute = ctx.createGain();
      mute.gain.value = 0;

      processor.onaudioprocess = (event) => {
        if (whisperActiveSession !== session || session.abortToken.cancelled) return;
        const channel = event.inputBuffer.getChannelData(0);
        session.chunks.push(new Float32Array(channel));
      };

      source.connect(processor);
      processor.connect(mute);
      mute.connect(ctx.destination);

      session.inputRate = ctx.sampleRate || 16000;
      session.media = { stream, ctx, source, processor, mute };
      session.state = 'recording';

      if (typeof opts.onStart === 'function') {
        try { opts.onStart({ target, lang: getWhisperLanguage(session.appLang) }); } catch { /* ignore */ }
      }

      return true;
    } catch (err) {
      cleanupWhisperAudio(session);
      whisperActiveSession = null;
      clearActiveBackend('whisper');
      target.removeAttribute('aria-busy');
      setHint(session.hintEl, '');

      const code = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
        ? 'not-allowed'
        : 'audio-capture';

      emitError({ options: opts }, code, err || null);
      setUiState((await hasWhisperAssets()) ? 'ready' : 'missing');
      return false;
    }
  }

  function whisperStop(options) {
    const session = whisperActiveSession;
    if (!session) return false;

    const opts = options || {};
    const cancel = !!opts.cancel;

    if (session.state === 'recording' || session.state === 'starting') {
      session.state = cancel ? 'aborting' : 'processing';
      cleanupWhisperAudio(session);

      if (cancel) {
        session.abortToken.cancelled = true;
        finishWhisperSession(session, { reason: 'abort', target: session.target });
      } else {
        setHint(session.hintEl, L('statusProcessing'));
        setUiState('processing');
        void processWhisperSession(session);
      }
      return true;
    }

    if (session.state === 'processing') {
      if (cancel) {
        session.abortToken.cancelled = true;
        finishWhisperSession(session, { reason: 'abort', target: session.target });
        return true;
      }
      return false;
    }

    return false;
  }

  function isProbablyMobile() {
    const nav = window.navigator || {};
    const ua = String(nav.userAgent || '');
    const coarsePointer = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i.test(ua);
    return coarsePointer || mobileUA;
  }

  function cleanFragment(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeCompare(text) {
    return cleanFragment(text).toLowerCase();
  }

  function mergePhrases(existing, addition) {
    const a = cleanFragment(existing);
    const b = cleanFragment(addition);

    if (!a) return b;
    if (!b) return a;

    const aNorm = normalizeCompare(a);
    const bNorm = normalizeCompare(b);

    if (!aNorm) return b;
    if (!bNorm) return a;
    if (aNorm === bNorm) return a;
    if (aNorm.endsWith(bNorm)) return a;
    if (bNorm.startsWith(aNorm)) return b;

    const aWords = aNorm.split(' ');
    const bWords = bNorm.split(' ');
    const aOrigWords = a.split(/\s+/);
    const bOrigWords = b.split(/\s+/);
    const maxOverlap = Math.min(aWords.length, bWords.length);

    for (let size = maxOverlap; size > 0; size--) {
      const left = aWords.slice(-size).join(' ');
      const right = bWords.slice(0, size).join(' ');
      if (left === right) {
        return aOrigWords.concat(bOrigWords.slice(size)).join(' ');
      }
    }

    return `${a} ${b}`;
  }

  function composeValue(base, transcript) {
    const rawBase = String(base || '');
    const cleanTranscript = cleanFragment(transcript);

    if (!cleanTranscript) return rawBase;
    if (!rawBase) return cleanTranscript;

    const separator = /[\s\n]$/.test(rawBase) ? '' : ' ';
    return rawBase + separator + cleanTranscript;
  }

  function extractTranscript(results) {
    let finalText = '';
    let interimText = '';

    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      const alt = res && res[0];
      const piece = cleanFragment(alt && alt.transcript);
      if (!piece) continue;

      if (res.isFinal) finalText = mergePhrases(finalText, piece);
      else interimText = mergePhrases(interimText, piece);
    }

    return {
      finalText,
      interimText,
      combinedText: mergePhrases(finalText, interimText)
    };
  }

  function clearBrowserUi(target, hintEl) {
    if (target) target.removeAttribute('aria-busy');
    setHint(hintEl, '');
  }

  function finalizeBrowserSession(sessionId, meta) {
    if (sessionId !== browserActiveSessionId) return;

    const target = browserActiveTarget;
    const hintEl = browserActiveHintEl;
    const options = browserActiveOptions;

    browserRecognition = null;
    browserActiveTarget = null;
    browserActiveHintEl = null;
    browserActiveOptions = null;
    browserBaseValue = '';
    browserLastRenderedValue = '';

    clearBrowserUi(target, hintEl);
    clearActiveBackend('browser');

    if (options && typeof options.onStop === 'function') {
      try { options.onStop(meta || {}); } catch { /* ignore */ }
    }
  }

  function browserStart(options) {
    const opts = options || {};
    const target = opts.target;

    if (!isTextField(target)) {
      if (typeof opts.onInvalidTarget === 'function') {
        try { opts.onInvalidTarget(); } catch { /* ignore */ }
      }
      return false;
    }

    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (!RecognitionCtor) {
      if (typeof opts.onUnsupported === 'function') {
        try { opts.onUnsupported(); } catch { /* ignore */ }
      }
      return false;
    }

    if (browserRecognition && browserActiveTarget === target) {
      browserStop();
      return false;
    }

    const sessionId = browserActiveSessionId + 1;
    const previousRecognition = browserRecognition;
    const previousTarget = browserActiveTarget;
    const previousHintEl = browserActiveHintEl;
    browserActiveSessionId = sessionId;

    if (previousRecognition) {
      clearBrowserUi(previousTarget, previousHintEl);
      try { previousRecognition.abort(); } catch { /* ignore */ }
    }

    const recognition = new RecognitionCtor();
    const mobile = isProbablyMobile();

    browserRecognition = recognition;
    browserActiveTarget = target;
    browserActiveHintEl = opts.hintEl || null;
    browserActiveOptions = opts;
    browserBaseValue = String(target.value || '');
    browserLastRenderedValue = browserBaseValue;

    setActiveBackend('browser');
    target.setAttribute('aria-busy', 'true');
    safeFocus(target);
    setHint(browserActiveHintEl, TX('transcription.browserStatusListening', 'browserStatusListening'));

    recognition.lang = resolveBrowserRecognitionLang(opts.appLang);
    recognition.continuous = false;
    recognition.interimResults = !mobile;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (sessionId !== browserActiveSessionId) return;
      if (typeof opts.onStart === 'function') {
        try { opts.onStart({ target, lang: recognition.lang, mobile }); } catch { /* ignore */ }
      }
    };

    recognition.onresult = (event) => {
      if (sessionId !== browserActiveSessionId || !browserActiveTarget) return;

      const transcript = extractTranscript(event.results);
      const nextValue = composeValue(browserBaseValue, transcript.combinedText);

      if (nextValue !== browserLastRenderedValue) {
        renderToTarget(browserActiveTarget, nextValue);
        browserLastRenderedValue = nextValue;
      }
    };

    recognition.onspeechend = () => {
      if (sessionId !== browserActiveSessionId) return;
      try { recognition.stop(); } catch { /* ignore */ }
    };

    recognition.onerror = (event) => {
      if (sessionId !== browserActiveSessionId) return;

      const code = event && event.error ? event.error : 'unknown';
      if (code !== 'aborted' && typeof opts.onError === 'function') {
        try { opts.onError(code, event || null); } catch { /* ignore */ }
      }
    };

    recognition.onend = () => {
      finalizeBrowserSession(sessionId, { reason: 'end', target });
    };

    try {
      recognition.start();
      return true;
    } catch (err) {
      if (typeof opts.onError === 'function') {
        try { opts.onError('start-failed', err); } catch { /* ignore */ }
      }
      finalizeBrowserSession(sessionId, { reason: 'start-failed', target });
      return false;
    }
  }

  function browserStop(options) {
    if (!browserRecognition) return false;

    const opts = options || {};
    const recognition = browserRecognition;
    const sessionId = browserActiveSessionId;

    try {
      if (opts.cancel) recognition.abort();
      else recognition.stop();
    } catch {
      finalizeBrowserSession(sessionId, { reason: opts.cancel ? 'abort' : 'stop', target: browserActiveTarget });
    }

    return true;
  }

  function setMode(mode) {
    const next = normalizeMode(mode);
    const prev = currentMode();
    if (prev === next) {
      refreshSettingsUi();
      return next;
    }

    stop({ cancel: true });
    safeSet(MODE_KEY, next);
    refreshSettingsUi();
    return next;
  }

  function toggle(options) {
    const selectedMode = currentMode();
    const target = options && options.target;

    if (activeBackend && activeBackend !== selectedMode) {
      stop({ cancel: true });
    }

    if (selectedMode === 'browser') {
      if (browserRecognition && browserActiveTarget && target && browserActiveTarget === target) {
        browserStop();
        return false;
      }
      return browserStart(options);
    }

    if (whisperActiveSession && target && whisperActiveSession.target === target && whisperActiveSession.state === 'recording') {
      whisperStop();
      return false;
    }
    if (whisperActiveSession && target && whisperActiveSession.target === target && whisperActiveSession.state === 'processing') {
      return false;
    }
    return whisperStart(options);
  }

  function stop(options) {
    if (activeBackend === 'browser') return browserStop(options || {});
    if (activeBackend === 'whisper') return whisperStop(options || {});

    const stoppedBrowser = browserStop(options || {});
    const stoppedWhisper = whisperStop(options || {});
    return stoppedBrowser || stoppedWhisper;
  }

  function isRecording(target) {
    if (activeBackend === 'browser') {
      if (!browserRecognition) return false;
      return target ? browserActiveTarget === target : true;
    }

    if (activeBackend === 'whisper') {
      if (!whisperActiveSession) return false;
      return target ? whisperActiveSession.target === target : true;
    }

    if (browserRecognition) return target ? browserActiveTarget === target : true;
    if (whisperActiveSession) return target ? whisperActiveSession.target === target : true;
    return false;
  }

  function attachSettingsHandlers() {
    updateDomRefs();
    if (!settingsReady || settingsWired) return;
    settingsWired = true;

    dom.downloadBtn.addEventListener('click', () => {
      void downloadModel();
    });

    if (dom.commandDownloadBtn) {
      dom.commandDownloadBtn.addEventListener('click', () => {
        void downloadModel();
      });
    }

    dom.deleteBtn.addEventListener('click', () => {
      void deleteModel();
    });

    dom.modeSelect.addEventListener('change', () => {
      setMode(dom.modeSelect.value);
    });

    if (dom.commandModeSelect) {
      dom.commandModeSelect.addEventListener('change', () => {
        setMode(dom.commandModeSelect.value);
      });
    }
  }

  async function syncInitialUi() {
    updateDomRefs();
    attachSettingsHandlers();
    setUiState('checking');
    const ready = await hasWhisperAssets();
    setUiState(ready ? 'ready' : 'missing');
  }

  document.addEventListener('DOMContentLoaded', () => {
    safeSet(MODE_KEY, currentMode());
    void syncInitialUi();

    if (window.i18n && typeof window.i18n.onChange === 'function') {
      window.i18n.onChange(() => {
        refreshSettingsUi();
      });
    }

    window.addEventListener('online', () => {
      refreshSettingsUi();
    });

    window.addEventListener('offline', () => {
      refreshSettingsUi();
    });
  });

  window.ReKPiTuTranscription = {
    isSupported,
    isRecording,
    start(options) {
      return currentMode() === 'browser' ? browserStart(options || {}) : whisperStart(options || {});
    },
    stop,
    toggle,
    downloadModel,
    deleteModel,
    hasCachedModel,
    hasCachedRuntime,
    hasWhisperAssets,
    getErrorMessage,
    getMode() {
      return currentMode();
    },
    setMode,
    resolveRecognitionLang(appLang) {
      return currentMode() === 'browser'
        ? resolveBrowserRecognitionLang(appLang)
        : getWhisperLanguage(appLang);
    },
    refreshSettingsUi
  };
})();
