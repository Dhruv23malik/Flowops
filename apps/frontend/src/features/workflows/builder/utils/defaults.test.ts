import { describe, it, expect } from 'vitest';
import {
  generateNodeId,
  generateEdgeId,
  getDefaultConfig,
  getDefaultPosition,
} from './defaults';

describe('getDefaultConfig', () => {
  it('returns a usable default for every node type', () => {
    expect(getDefaultConfig('manual_trigger')).toEqual({});
    expect(getDefaultConfig('ai_analyze')).toEqual({ prompt: '', outputKey: 'result' });
    expect(getDefaultConfig('condition')).toEqual({ field: '', operator: '==', value: '' });
    expect(getDefaultConfig('save_result')).toEqual({ resultKey: 'result' });
    expect(getDefaultConfig('http_request')).toEqual({
      url: '',
      method: 'GET',
      outputKey: 'http_response',
    });
    expect(getDefaultConfig('delay')).toEqual({ seconds: 5 });
    expect(getDefaultConfig('set_variable')).toEqual({ outputKey: 'my_value', value: '' });
  });
});

describe('generateNodeId / generateEdgeId', () => {
  it('generates unique node ids with the node_ prefix', () => {
    const ids = new Set([generateNodeId(), generateNodeId(), generateNodeId()]);
    expect(ids.size).toBe(3);
    for (const id of ids) expect(id.startsWith('node_')).toBe(true);
  });

  it('includes the branch handle in edge ids when given', () => {
    expect(generateEdgeId('a', 'b')).toBe('edge_a_b');
    expect(generateEdgeId('a', 'b', 'yes')).toBe('edge_a_b_yes');
  });
});

describe('getDefaultPosition', () => {
  it('stacks new nodes vertically', () => {
    const first = getDefaultPosition(0);
    const second = getDefaultPosition(1);
    expect(first.x).toBe(second.x);
    expect(second.y).toBeGreaterThan(first.y);
  });
});
