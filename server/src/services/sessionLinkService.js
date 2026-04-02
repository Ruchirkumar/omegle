import { v4 as uuidv4 } from "uuid";

export class SessionLinkService {
  constructor({ ttlMs = 10 * 60 * 1000 } = {}) {
    this.ttlMs = ttlMs;
    this.links = new Map();
  }

  create(hostSocketId) {
    const token = uuidv4().slice(0, 8);
    const expiresAt = Date.now() + this.ttlMs;

    this.links.set(token, {
      token,
      hostSocketId,
      expiresAt
    });

    return {
      token,
      expiresAt
    };
  }

  consume(token) {
    const link = this.links.get(token);

    if (!link) {
      return null;
    }

    if (link.expiresAt <= Date.now()) {
      this.links.delete(token);
      return null;
    }

    this.links.delete(token);
    return link;
  }

  cleanup() {
    const now = Date.now();

    for (const [token, link] of this.links.entries()) {
      if (link.expiresAt <= now) {
        this.links.delete(token);
      }
    }
  }

  invalidateHost(hostSocketId) {
    for (const [token, link] of this.links.entries()) {
      if (link.hostSocketId === hostSocketId) {
        this.links.delete(token);
      }
    }
  }
}
