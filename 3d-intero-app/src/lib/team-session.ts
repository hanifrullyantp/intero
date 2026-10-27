// 3D Intero — Kolaborasi P2P langsung tanpa backend/signaling server.
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { ProjectData } from '../types';

export type TeamStatus = 'idle' | 'preparing' | 'waiting-answer' | 'connecting' | 'connected' | 'error';
export interface TeamState { status: TeamStatus; role: 'host' | 'guest' | null; message: string }
type Listener = (state: TeamState) => void;

const SIGNAL_PREFIX = '3DINTERO-P2P:';

function encodeSignal(value: RTCSessionDescriptionInit) {
  return SIGNAL_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(value))));
}
function decodeSignal(value: string): RTCSessionDescriptionInit {
  const text = value.trim();
  try {
    if (text.startsWith(SIGNAL_PREFIX)) return JSON.parse(decodeURIComponent(escape(atob(text.slice(SIGNAL_PREFIX.length))))) as RTCSessionDescriptionInit;
    return JSON.parse(text) as RTCSessionDescriptionInit;
  } catch { throw new Error('Kode koneksi tidak valid. Salin seluruh kode, termasuk awalan 3DINTERO-P2P.'); }
}

function waitForIce(pc: RTCPeerConnection, timeout = 7000): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => { cleanup(); resolve(); };
    const timer = window.setTimeout(done, timeout);
    const cleanup = () => { window.clearTimeout(timer); pc.removeEventListener('icegatheringstatechange', onState); };
    const onState = () => { if (pc.iceGatheringState === 'complete') done(); };
    pc.addEventListener('icegatheringstatechange', onState);
  });
}

class TeamSession {
  private pc: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;
  private listeners = new Set<Listener>();
  private snapshotHandler: ((data: ProjectData) => void) | null = null;
  private current: TeamState = { status: 'idle', role: null, message: 'Belum terhubung' };
  private seq = 0;

  get state() { return this.current; }
  get connected() { return this.current.status === 'connected' && this.channel?.readyState === 'open'; }
  get role() { return this.current.role; }

  subscribe(listener: Listener) { this.listeners.add(listener); listener(this.current); return () => { this.listeners.delete(listener); }; }
  onSnapshot(handler: (data: ProjectData) => void) { this.snapshotHandler = handler; }

  private setState(state: TeamState) { this.current = state; for (const listener of this.listeners) listener(state); }

  private async reset(role: 'host' | 'guest') {
    this.close(false);
    if (!('RTCPeerConnection' in window)) throw new Error('Browser ini belum mendukung WebRTC.');
    this.setState({ status: 'preparing', role, message: 'Mempersiapkan koneksi langsung...' });
    // Tidak memakai STUN/TURN atau signaling server; koneksi langsung untuk jaringan yang dapat dijangkau.
    this.pc = new RTCPeerConnection({ iceServers: [] });
    this.pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      if (this.pc.connectionState === 'connected') this.setState({ status: 'connected', role, message: 'Tim terhubung langsung' });
      else if (this.pc.connectionState === 'failed' || this.pc.connectionState === 'disconnected') this.setState({ status: 'error', role, message: 'Koneksi terputus. Pastikan kedua perangkat dapat terhubung langsung di jaringan yang sama.' });
    };
    this.pc.ondatachannel = (event) => this.attachChannel(event.channel, role);
  }

  private attachChannel(channel: RTCDataChannel, role: 'host' | 'guest') {
    this.channel = channel;
    channel.binaryType = 'arraybuffer';
    channel.onopen = () => this.setState({ status: 'connected', role, message: 'Tim terhubung langsung — perubahan proyek tersinkron' });
    channel.onclose = () => this.setState({ status: 'idle', role: null, message: 'Koneksi kolaborasi ditutup' });
    channel.onerror = () => this.setState({ status: 'error', role, message: 'Kanal data mengalami gangguan' });
    channel.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      try {
        const packet = JSON.parse(event.data) as { type?: string; payload?: string };
        if (packet.type !== 'project' || !packet.payload) return;
        const json = decompressFromEncodedURIComponent(packet.payload);
        if (!json) return;
        const value = JSON.parse(json) as ProjectData;
        if (Array.isArray(value.cabinets) && Array.isArray(value.walls) && value.settings) this.snapshotHandler?.(value);
      } catch { this.setState({ status: 'error', role, message: 'Data proyek dari rekan tidak dapat dibaca' }); }
    };
  }

  async createInvite(): Promise<string> {
    await this.reset('host');
    const pc = this.pc!;
    this.attachChannel(pc.createDataChannel('3d-intero-project', { ordered: true }), 'host');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIce(pc);
    if (!pc.localDescription) throw new Error('Kode undangan tidak berhasil dibuat.');
    this.setState({ status: 'waiting-answer', role: 'host', message: 'Kirim kode undangan ke anggota tim, lalu tempel kode jawaban mereka.' });
    return encodeSignal(pc.localDescription.toJSON());
  }

  async acceptAnswer(code: string) {
    const pc = this.pc;
    if (!pc || this.current.role !== 'host') throw new Error('Buat kode undangan terlebih dahulu.');
    const answer = decodeSignal(code);
    if (answer.type !== 'answer') throw new Error('Kode yang ditempel bukan kode jawaban dari anggota tim.');
    await pc.setRemoteDescription(answer);
    this.setState({ status: 'connecting', role: 'host', message: 'Menghubungkan anggota tim...' });
  }

  async joinInvite(code: string): Promise<string> {
    await this.reset('guest');
    const pc = this.pc!;
    const offer = decodeSignal(code);
    if (offer.type !== 'offer') throw new Error('Kode yang ditempel bukan kode undangan.');
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIce(pc);
    if (!pc.localDescription) throw new Error('Kode jawaban tidak berhasil dibuat.');
    this.setState({ status: 'connecting', role: 'guest', message: 'Kirim kode jawaban ke pembuat undangan.' });
    return encodeSignal(pc.localDescription.toJSON());
  }

  sendProject(data: ProjectData) {
    if (!this.connected || !this.channel) return;
    try {
      const payload = compressToEncodedURIComponent(JSON.stringify(data));
      this.channel.send(JSON.stringify({ type: 'project', seq: ++this.seq, payload }));
    } catch { this.setState({ status: 'error', role: this.current.role, message: 'Proyek terlalu besar untuk dikirim melalui koneksi langsung.' }); }
  }

  close(updateState = true) {
    if (this.channel) { this.channel.onopen = null; this.channel.onclose = null; this.channel.onmessage = null; try { this.channel.close(); } catch { /* ignore */ } }
    if (this.pc) { this.pc.ondatachannel = null; this.pc.onconnectionstatechange = null; try { this.pc.close(); } catch { /* ignore */ } }
    this.channel = null; this.pc = null;
    if (updateState) this.setState({ status: 'idle', role: null, message: 'Belum terhubung' });
  }
}

export const teamSession = new TeamSession();