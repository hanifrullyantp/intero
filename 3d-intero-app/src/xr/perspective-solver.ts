// 3D Intero — Solver perspektif foto: homografi 4 titik lantai → pose kamera (tanpa OpenCV)
import * as THREE from 'three';

/** Selesaikan sistem linear n×n (Gauss-Jordan, pivot parsial). */
function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const k = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

/** Homografi H (3×3) memetakan titik bidang (X,Y) → piksel (u,v). */
export function homography(plane: [number, number][], img: [number, number][]): number[] | null {
  const A: number[][] = [], b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [X, Y] = plane[i], [u, v] = img[i];
    A.push([X, Y, 1, 0, 0, 0, -u * X, -u * Y]); b.push(u);
    A.push([0, 0, 0, X, Y, 1, -v * X, -v * Y]); b.push(v);
  }
  const h = solveLinear(A, b);
  return h ? [...h, 1] : null;
}

export interface SolvedCamera { position: THREE.Vector3; quaternion: THREE.Quaternion; fov: number; height: number }

/**
 * Pose kamera dari persegi panjang lantai (W×D meter) yang dilabel 4 titik gambar:
 * P0 belakang-kiri, P1 belakang-kanan, P2 depan-kanan, P3 depan-kiri. Kerangka dunia: X kanan, Z ke depan (arah kamera), Y atas.
 */
export function solveCameraFromRect(imgPts: [number, number][], W: number, D: number, imgW: number, imgH: number, fovVDeg: number): SolvedCamera | null {
  const plane: [number, number][] = [[0, 0], [W, 0], [W, D], [0, D]];
  const H = homography(plane, imgPts);
  if (!H) return null;
  const f = (imgH / 2) / Math.tan((fovVDeg * Math.PI) / 360);
  const cx = imgW / 2, cy = imgH / 2;
  // K^-1 * kolom H  (v dibalik: piksel y ke bawah)
  const inv = (c: number[]) => [(c[0] - cx * c[2]) / f, (c[1] - cy * c[2]) / f, c[2]];
  const m1 = inv([H[0], H[3], H[6]]), m2 = inv([H[1], H[4], H[7]]), m3 = inv([H[2], H[5], H[8]]);
  const lam = 2 / (Math.hypot(m1[0], m1[1], m1[2]) + Math.hypot(m2[0], m2[1], m2[2]));
  let r1 = new THREE.Vector3(...m1).multiplyScalar(lam), r2 = new THREE.Vector3(...m2).multiplyScalar(lam), t = new THREE.Vector3(...m3).multiplyScalar(lam);
  if (t.z < 0) { r1.negate(); r2.negate(); t.negate(); }
  r1.normalize(); r2.sub(r1.clone().multiplyScalar(r1.dot(r2))).normalize();
  const r3 = new THREE.Vector3().crossVectors(r1, r2);
  // R (bidang→kamera OpenCV) kolom r1,r2,r3. Pusat kamera di kerangka bidang: C = -R^T t
  const Rm = new THREE.Matrix3().set(r1.x, r2.x, r3.x, r1.y, r2.y, r3.y, r1.z, r2.z, r3.z);
  const Rt = Rm.clone().transpose();
  const C = t.clone().negate().applyMatrix3(Rt);
  // Bidang (X,Y,Z) → Three (Xw=X, Yw=-Z, Zw=Y)
  const M = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
  const camW = new THREE.Vector3(C.x, C.y, C.z).applyMatrix4(M);
  // Rotasi kamera→dunia (Three) = M * R^T * diag(1,-1,-1)
  const RtM4 = new THREE.Matrix4().set(Rt.elements[0], Rt.elements[3], Rt.elements[6], 0, Rt.elements[1], Rt.elements[4], Rt.elements[7], 0, Rt.elements[2], Rt.elements[5], Rt.elements[8], 0, 0, 0, 0, 1);
  const flip = new THREE.Matrix4().makeScale(1, -1, -1);
  const rot = new THREE.Matrix4().multiplyMatrices(M, RtM4).multiply(flip);
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(rot);
  return { position: camW, quaternion, fov: fovVDeg, height: camW.y };
}
