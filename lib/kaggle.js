/**
 * Kaggle API Client - Node.js wrapper for Kaggle operations
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export class KaggleClient {
  constructor(options = {}) {
    this.username = options.username || process.env.KAGGLE_USERNAME;
    this.key = options.key || process.env.KAGGLE_KEY;
    this.dataDir = options.dataDir || './data/raw';
    this.isAvailable = false;
    
    this._checkAvailability();
  }

  async _checkAvailability() {
    try {
      await execAsync('kaggle --version');
      this.isAvailable = true;
    } catch {
      this.isAvailable = false;
    }
  }

  /**
   * Setup Kaggle credentials
   */
  async setupCredentials() {
    if (!this.username || !this.key) {
      throw new Error('Kaggle credentials not provided');
    }

    const kaggleDir = path.join(process.env.HOME || '~', '.kaggle');
    const kaggleFile = path.join(kaggleDir, 'kaggle.json');

    // Create directory
    if (!fs.existsSync(kaggleDir)) {
      fs.mkdirSync(kaggleDir, { recursive: true });
    }

    // Write credentials
    fs.writeFileSync(kaggleFile, JSON.stringify({
      username: this.username,
      key: this.key
    }, null, 2));

    // Set permissions
    fs.chmodSync(kaggleFile, 0o600);

    console.log('✅ Kaggle credentials configured');
  }

  /**
   * Download Titanic dataset
   */
  async downloadTitanic(force = false) {
    if (!this.isAvailable) {
      throw new Error('Kaggle CLI not available');
    }

    // Check if files exist
    const trainPath = path.join(this.dataDir, 'train.csv');
    const testPath = path.join(this.dataDir, 'test.csv');

    if (fs.existsSync(trainPath) && fs.existsSync(testPath) && !force) {
      console.log('📁 Dataset already exists, using cached version');
      return {
        path: this.dataDir,
        cached: true,
        train: trainPath,
        test: testPath
      };
    }

    // Create directory
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Download
    console.log('📥 Downloading dataset from Kaggle...');
    
    await execAsync(
      `kaggle competitions download -c titanic -p ${this.dataDir}`
    );

    // Unzip files
    const files = fs.readdirSync(this.dataDir);
    for (const file of files) {
      if (file.endsWith('.zip')) {
        const zipPath = path.join(this.dataDir, file);
        await execAsync(`unzip -o ${zipPath} -d ${this.dataDir}`);
        fs.unlinkSync(zipPath);
      }
    }

    console.log('✅ Dataset downloaded successfully');

    return {
      path: this.dataDir,
      cached: false,
      train: trainPath,
      test: testPath
    };
  }

  /**
   * Get dataset info
   */
  getDatasetInfo() {
    const trainPath = path.join(this.dataDir, 'train.csv');
    const testPath = path.join(this.dataDir, 'test.csv');

    return {
      dataDir: this.dataDir,
      hasTrain: fs.existsSync(trainPath),
      hasTest: fs.existsSync(testPath),
      trainSize: fs.existsSync(trainPath) ? fs.statSync(trainPath).size : 0,
      testSize: fs.existsSync(testPath) ? fs.statSync(testPath).size : 0
    };
  }

  /**
   * Check if Kaggle is available
   */
  async isKaggleAvailable() {
    await this._checkAvailability();
    return this.isAvailable;
  }
}

// Export singleton instance
export const kaggle = new KaggleClient();