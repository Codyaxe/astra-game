/**
 * linkedListConstellation.js — Data structure and validation engine for
 * constellations represented as a linked list of connected star nodes.
 */

export class StarNode {
  constructor({ id, label, x, y, next_node_id = null, hitbox_radius = 0.055 }) {
    this.id = id;
    this.label = label;
    this.x = x;
    this.y = y;
    this.next_node_id = next_node_id;
    this.hitbox_radius = hitbox_radius;
  }
}

export class ConstellationLinkedList {
  constructor(constellationData) {
    this.id = constellationData.id;
    this.name = constellationData.name;
    this.headNodeId = constellationData.head_node_id;
    this.timeLimitSec = constellationData.time_limit_sec || 30;
    this.nodes = new Map();
    this.fakeNodes = constellationData.fake_nodes || [];

    // Populate star nodes map
    for (const nodeData of constellationData.star_nodes || []) {
      this.nodes.set(nodeData.id, new StarNode(nodeData));
    }
  }

  getHead() {
    return this.nodes.get(this.headNodeId) || null;
  }

  getNode(id) {
    return this.nodes.get(id) || null;
  }

  getAllStarNodes() {
    return Array.from(this.nodes.values());
  }

  getAllFakeNodes() {
    return this.fakeNodes;
  }

  /**
   * Validates if `targetNodeId` is the exact expected next star in sequence for `currentNodeId`.
   */
  isValidNextStep(currentNodeId, targetNodeId) {
    const current = this.nodes.get(currentNodeId);
    if (!current) return false;
    return current.next_node_id === targetNodeId;
  }

  /**
   * Count total expected connections in this linked chain.
   */
  getTotalRequiredConnections() {
    let count = 0;
    for (const node of this.nodes.values()) {
      if (node.next_node_id !== null && node.next_node_id !== undefined) {
        count++;
      }
    }
    return count;
  }
}
