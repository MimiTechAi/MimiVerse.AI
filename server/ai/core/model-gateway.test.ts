import { describe, it, expect, beforeEach } from 'vitest';
import { ModelRouter, TaskType } from './model-gateway';

describe('ModelRouter.selectModel', () => {
  beforeEach(() => {
    process.env.OLLAMA_CHAT_MODEL = 'chat-model';
    process.env.OLLAMA_COMPLETION_MODEL = 'completion-model';
    process.env.OLLAMA_EMBEDDING_MODEL = 'embedding-model';
    process.env.OLLAMA_REASONING_MODEL = 'reasoning-model';
    process.env.OLLAMA_VISION_MODEL = 'vision-model';
  });

  it('uses completion model for inline_completion', () => {
    const router = new ModelRouter();
    const model = router.selectModel('inline_completion');
    expect(model).toBe('completion-model');
  });

  it('uses chat model for code_generation', () => {
    const router = new ModelRouter();
    const model = router.selectModel('code_generation');
    expect(model).toBe('chat-model');
  });

  it('uses reasoning model for architecture_design', () => {
    const router = new ModelRouter();
    const model = router.selectModel('architecture_design');
    expect(model).toBe('reasoning-model');
  });

  it('uses vision model for screenshot_to_code', () => {
    const router = new ModelRouter();
    const model = router.selectModel('screenshot_to_code');
    expect(model).toBe('vision-model');
  });

  it('uses embedding model for embedding task type', () => {
    const router = new ModelRouter();
    const model = router.selectModel('embedding');
    expect(model).toBe('embedding-model');
  });
});
