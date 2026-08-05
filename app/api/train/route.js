import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { writeFile, readFile } from 'fs/promises';

const execAsync = promisify(exec);

// Training status tracking
let trainingStatus = {
  status: 'idle', // idle | running | complete | error
  progress: 0,
  message: '',
  start_time: null,
  end_time: null,
  error: null,
  metrics: null
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { action = 'start', force = false } = body;

    // Check if training is already running
    if (trainingStatus.status === 'running') {
      return NextResponse.json({
        status: 'running',
        message: 'Training already in progress',
        progress: trainingStatus.progress
      });
    }

    // Check if model exists
    const modelPath = path.join(process.cwd(), 'data', 'models', 'titanic_ensemble.pkl');
    const modelExists = fs.existsSync(modelPath);

    if (modelExists && !force) {
      return NextResponse.json({
        status: 'exists',
        message: 'Model already exists. Use force=true to retrain.',
        model_path: modelPath,
        metrics: trainingStatus.metrics
      });
    }

    // Start training
    trainingStatus = {
      status: 'running',
      progress: 0,
      message: 'Starting training...',
      start_time: new Date().toISOString(),
      end_time: null,
      error: null,
      metrics: null
    };

    // Run training asynchronously
    runTraining();

    return NextResponse.json({
      status: 'started',
      message: 'Training started',
      training_id: Date.now().toString()
    });

  } catch (error) {
    console.error('Training error:', error);
    trainingStatus.status = 'error';
    trainingStatus.error = error.message;
    
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function runTraining() {
  try {
    // Update status
    updateStatus('progress', 'Fetching dataset from Kaggle...', 10);

    // Fetch data from Kaggle
    await fetchKaggleData();

    updateStatus('progress', 'Preprocessing data...', 30);

    // Run Python training script
    const scriptPath = path.join(process.cwd(), 'backend', 'train.py');
    
    if (!fs.existsSync(scriptPath)) {
      throw new Error('Training script not found');
    }

    updateStatus('progress', 'Training ensemble model...', 50);

    const pythonProcess = spawn('python', [
      scriptPath,
      '--model-path', './data/models/titanic_ensemble.pkl',
      '--log-level', 'info'
    ]);

    let output = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Parse progress from output
      if (text.includes('Progress:')) {
        const match = text.match(/Progress:\s*(\d+)%/);
        if (match) {
          const progress = parseInt(match[1]);
          updateStatus('progress', text.trim(), 50 + progress * 0.4);
        }
      } else if (text.includes('Training')) {
        updateStatus('progress', text.trim(), 60);
      } else if (text.includes('Feature')) {
        updateStatus('progress', text.trim(), 70);
      } else if (text.includes('Saving')) {
        updateStatus('progress', text.trim(), 90);
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(error || `Process exited with code ${code}`));
        }
      });
    });

    // Extract metrics from output
    const metrics = extractMetrics(output);

    updateStatus('complete', 'Training complete!', 100, metrics);

  } catch (error) {
    console.error('Training error:', error);
    trainingStatus.status = 'error';
    trainingStatus.error = error.message;
  }
}

async function fetchKaggleData() {
  const datasetName = process.env.DATASET_NAME || 'titanic';
  const dataPath = path.join(process.cwd(), 'data', 'raw');

  // Create directory
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }

  try {
    // Check if kaggle CLI is available
    await execAsync('kaggle --version');
  } catch {
    // Install kaggle CLI if not available
    await execAsync('pip install kaggle');
  }

  // Download dataset
  const command = `kaggle competitions download -c ${datasetName} -p ${dataPath}`;
  await execAsync(command);

  // Unzip files
  const files = fs.readdirSync(dataPath);
  for (const file of files) {
    if (file.endsWith('.zip')) {
      await execAsync(`unzip -o ${path.join(dataPath, file)} -d ${dataPath}`);
      fs.unlinkSync(path.join(dataPath, file));
    }
  }

  // Verify files
  const trainPath = path.join(dataPath, 'train.csv');
  const testPath = path.join(dataPath, 'test.csv');
  
  if (!fs.existsSync(trainPath) || !fs.existsSync(testPath)) {
    throw new Error('Dataset download failed - required files missing');
  }
}

function extractMetrics(output) {
  const metrics = {
    train_accuracy: null,
    test_accuracy: null,
    auc: null,
    f1: null,
    features: null,
    training_time: null
  };

  // Parse output for metrics
  const accuracyMatch = output.match(/Accuracy:\s*([\d.]+)/i);
  if (accuracyMatch) {
    metrics.test_accuracy = parseFloat(accuracyMatch[1]);
  }

  const aucMatch = output.match(/AUC:\s*([\d.]+)/i);
  if (aucMatch) {
    metrics.auc = parseFloat(aucMatch[1]);
  }

  const f1Match = output.match(/F1:\s*([\d.]+)/i);
  if (f1Match) {
    metrics.f1 = parseFloat(f1Match[1]);
  }

  const featuresMatch = output.match(/Features:\s*(\d+)/i);
  if (featuresMatch) {
    metrics.features = parseInt(featuresMatch[1]);
  }

  const timeMatch = output.match(/Time:\s*([\d.]+)\s*(?:seconds|s)/i);
  if (timeMatch) {
    metrics.training_time = parseFloat(timeMatch[1]);
  }

  return metrics;
}

function updateStatus(status, message, progress, metrics = null) {
  trainingStatus.status = status;
  trainingStatus.message = message;
  trainingStatus.progress = progress || trainingStatus.progress;
  
  if (metrics) {
    trainingStatus.metrics = metrics;
  }
  
  if (status === 'complete') {
    trainingStatus.end_time = new Date().toISOString();
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    if (action === 'status') {
      return NextResponse.json({
        ...trainingStatus,
        model_exists: fs.existsSync(path.join(process.cwd(), 'data', 'models', 'titanic_ensemble.pkl'))
      });
    }

    if (action === 'metrics') {
      const modelPath = path.join(process.cwd(), 'data', 'models', 'titanic_ensemble.pkl');
      if (!fs.existsSync(modelPath)) {
        return NextResponse.json(
          { error: 'Model not found' },
          { status: 404 }
        );
      }

      // Load model metrics
      // In production, load from saved model metadata
      const metrics = {
        model_path: modelPath,
        model_size: (fs.statSync(modelPath).size / (1024 * 1024)).toFixed(2) + ' MB',
        last_modified: fs.statSync(modelPath).mtime,
        ...trainingStatus.metrics
      };

      return NextResponse.json(metrics);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Webhook for training updates (for real-time progress)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { progress, message, status, metrics } = body;

    if (status) {
      trainingStatus.status = status;
    }
    if (message) {
      trainingStatus.message = message;
    }
    if (progress !== undefined) {
      trainingStatus.progress = progress;
    }
    if (metrics) {
      trainingStatus.metrics = { ...trainingStatus.metrics, ...metrics };
    }

    if (status === 'complete') {
      trainingStatus.end_time = new Date().toISOString();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}