"""Render actual world-report inputs; no engine capture or runtime performance inference."""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon
from matplotlib.colors import LinearSegmentedColormap, PowerNorm

parser = argparse.ArgumentParser()
parser.add_argument('report', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
world = json.loads((args.report / 'world-map-input.json').read_text())
census = json.loads((args.report / 'world-census.json').read_text())
h = np.array(world['heights'])
coordinates = np.linspace(-4, 4, len(h))
fig, ax = plt.subplots(figsize=(12, 11))
cmap = LinearSegmentedColormap.from_list('island',
    ['#91b26a', '#a8b474', '#b1aa78', '#a79c7d', '#b8ae98', '#e6e2d8'])
im = ax.imshow(np.ma.masked_less_equal(h, 0), origin='lower', extent=[-4, 4, -4, 4],
    cmap=cmap, norm=PowerNorm(.5, vmin=0, vmax=2000))
ax.set_facecolor('#397393')
ax.contour(coordinates, coordinates, h, levels=[0, 30, 100, 250, 500, 1000, 1500, 1800],
    colors='#506342', linewidths=.4, alpha=.65)
stands = {stand['id']: stand['roots'] for stand in world['stands']}
vegetation, rural = [], []
for instance in world['instances']:
    prop = instance['prop']
    x, y, z = instance['position']
    yaw = instance.get('yaw', 0)
    scale = instance.get('scale', 1)
    sx, _, sz = [scale] * 3 if isinstance(scale, (int, float)) else scale
    if prop in stands:
        co, si = np.cos(yaw), np.sin(yaw)
        for rx, rz, bole in stands[prop]:
            vegetation.append(((x + rx * sx * co + rz * sz * si) / 1000,
                (z - rx * sx * si + rz * sz * co) / 1000))
    elif prop.startswith(('tree-', 'bush-', 'rock', 'desert/')):
        vegetation.append((x / 1000, z / 1000))
    if instance.get('name', '').startswith('countryside/rural-house/'):
        rural.append((x / 1000, z / 1000))
if vegetation:
    v = np.array(vegetation)
    ax.scatter(v[:, 0], v[:, 1], s=.18, c='#34683d', alpha=.55, rasterized=True,
        label='Actual tree roots / vegetation / rocks')
for outline in world['lakeOutlines']:
    ax.add_patch(Polygon(np.array(outline) / 1000, color='#4c9fba'))
for river in world['rivers']:
    points = np.array(river['points'])
    ax.plot(points[:, 0] / 1000, points[:, 2] / 1000, color='#4c9fba', lw=1.6)
for road in world['roads']:
    points = np.array(road['points'])
    ax.plot(points[:, 0] / 1000, points[:, 2] / 1000, color='#51483b', lw=.35, alpha=.75)
    if road['class'] == 'runway':
        a, b = points[0, [0, 2]], points[-1, [0, 2]]
        d = b - a
        normal = np.array([-d[1], d[0]]) / np.linalg.norm(d) * road['width'] / 2
        ax.add_patch(Polygon(np.array([a+normal, b+normal, b-normal, a-normal]) / 1000,
            color='#272b2e'))
        ax.annotate('GA 900 m' if 'general' in road['id'] else 'Main 2.4 km',
            (a[0]/1000, a[1]/1000), xytext=(5, -5), textcoords='offset points', fontsize=8)
for building in world['buildings']:
    box = building.get('footprint')
    if not box:
        continue
    x, z = box['centre']
    hx, hz = box['half']
    co, si = np.cos(box['yaw']), np.sin(box['yaw'])
    poly = [((x+dx*co+dz*si)/1000, (z-dx*si+dz*co)/1000)
        for dx, dz in [(-hx,-hz), (hx,-hz), (hx,hz), (-hx,hz)]]
    ax.add_patch(Polygon(poly, facecolor='#af373b' if building.get('height', 0)>=50
        else '#756451', linewidth=0))
if rural:
    v = np.array(rural)
    ax.scatter(v[:, 0], v[:, 1], s=3, c='#93452c', marker='s',
        label=f'{len(rural)} actual rural homes')
cores = {core['id']: core for core in census['centres']}
for settlement in world['settlements']:
    if settlement['id'] not in cores:
        continue
    x, y, z = settlement['centre']
    core = cores[settlement['id']]
    ax.annotate(f"{settlement['id']}\n{core['buildings']} buildings · ground {y:.0f} m",
        (x/1000, z/1000), xytext=(8, 10), textcoords='offset points', fontsize=8,
        bbox=dict(facecolor='white', alpha=.85, pad=3))
ax.set(xlim=(-4,4), ylim=(4,-4), xlabel='East / West (km)',
    ylabel='North / South (km; +Z south)',
    title=f"Issue #15 — actual integrated source island · seed {census['seed']}\n"
        'Composed relief, five centres, physical runways, roads, water and vegetation')
ax.legend(loc='lower left', fontsize=8, facecolor='white')
fig.colorbar(im, ax=ax, label='Composed altitude (m)', shrink=.75)
coverage = census['coverage']
fig.text(.1,.015, f"Source key {census['sourceCookKey']} · includes #19 / #20 / local #21 · not an engine capture\n"
    f"{census['nodes']:,} nodes · {100*coverage['within10mFraction']:.2f}% eligible 20 m samples within 10 m"
    f" · {100*coverage['beyond30mFraction']:.2f}% ≥30 m (censored)\n"
    'Conservative actual vertex witnesses; roads, fields, water and steep cliffs excluded. '
    'Building outlines are conservative actual placed footprints.', fontsize=8)
fig.tight_layout(rect=(0,.07,1,1))
args.output.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(args.output, dpi=170)
proof = {'sourceHead': census['sourceHead'], 'sourceCookKey': census['sourceCookKey'], 'censusContentHash': census['contentHash'],
    'engineCommit': census['engineCommit'], 'seed': census['seed'],
    'mapInputSha256': hashlib.sha256((args.report/'world-map-input.json').read_bytes()).hexdigest(),
    'pngSha256': hashlib.sha256(args.output.read_bytes()).hexdigest(),
    'renderer': 'scripts/world-map.py',
    'rendererSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'scope': 'Actual source placements; no native GPU capture'}
args.output.with_suffix('.json').write_text(json.dumps(proof, indent=2)+'\n')
