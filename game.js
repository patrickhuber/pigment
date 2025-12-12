/*
 * Pigment Factory Grid - drag components, link ports, and watch colors flow.
 * Components: factories (4 outputs), adders (2 inputs -> 1 output, fan-out allowed),
 * gradientors (brighten/darken, fan-out allowed), storage (6 flex ports, per-port storage),
 * delete buttons, storage inventory panels, and empty start state.
 */

const gridBoard = document.getElementById('grid-board');
const connectionLayer = document.getElementById('connection-layer');
const toolbar = document.getElementById('grid-toolbar');
const resetButton = document.getElementById('reset-grid');

let components = [];
let connections = [];
let selectedPort = null;
let idCounter = 1;

function nextId(prefix) {
    idCounter += 1;
    return `${prefix}-${idCounter}`;
}

function portKey(ref) {
    return `${ref.componentId}:${ref.portId}`;
}

function setPortOutput(map, key, color) {
    const normalized = color || null;
    const current = map.has(key) ? map.get(key) : null;
    if (colorsEqual(current, normalized)) return false;
    map.set(key, normalized);
    return true;
}

function parseColor(colorStr) {
    return colorStr.split(',').map(Number);
}

function rgbToString(colorArray) {
    return `rgb(${colorArray[0]}, ${colorArray[1]}, ${colorArray[2]})`;
}

function mixColors(color1, color2) {
    const ryb1 = rgbToRyb(color1);
    const ryb2 = rgbToRyb(color2);
    const mixedRyb = [
        Math.round((ryb1[0] + ryb2[0]) / 2),
        Math.round((ryb1[1] + ryb2[1]) / 2),
        Math.round((ryb1[2] + ryb2[2]) / 2)
    ];
    return rybToRgb(mixedRyb);
}

function adjustColor(color, mode) {
    if (!color) return null;
    const factor = mode === 'darken' ? 0.8 : 1.2;
    return color.map(value => Math.max(0, Math.min(255, Math.round(value * factor))));
}

function cubicInt(t, a, b) {
    const weight = t * t * (3 - 2 * t);
    return a + weight * (b - a);
}

function interpolateComponent(iR, iY, iB, colors, component) {
    const x0 = cubicInt(iB, colors[0][component], colors[1][component]);
    const x1 = cubicInt(iB, colors[2][component], colors[3][component]);
    const x2 = cubicInt(iB, colors[4][component], colors[5][component]);
    const x3 = cubicInt(iB, colors[6][component], colors[7][component]);
    const y0 = cubicInt(iY, x0, x1);
    const y1 = cubicInt(iY, x2, x3);
    return cubicInt(iR, y0, y1);
}

function rybToRgb(ryb) {
    const COLORS = [
        [255, 255, 255],
        [0, 0, 255],
        [255, 255, 0],
        [0, 255, 0],
        [255, 0, 0],
        [128, 0, 128],
        [255, 128, 0],
        [0, 0, 0]
    ];

    const r = ryb[0] / 255;
    const y = ryb[1] / 255;
    const b = ryb[2] / 255;

    const outR = interpolateComponent(r, y, b, COLORS, 0);
    const outG = interpolateComponent(r, y, b, COLORS, 1);
    const outB = interpolateComponent(r, y, b, COLORS, 2);

    return [
        Math.round(Math.min(255, Math.max(0, outR))),
        Math.round(Math.min(255, Math.max(0, outG))),
        Math.round(Math.min(255, Math.max(0, outB)))
    ];
}

function rgbToRyb(rgb) {
    let r = rgb[0];
    let g = rgb[1];
    let b = rgb[2];

    const white = Math.min(r, g, b);
    r -= white;
    g -= white;
    b -= white;

    const maxG = Math.max(r, g, b);

    let y = Math.min(r, g);
    r -= y;
    g -= y;

    if (b > 0 && g > 0) {
        b = Math.floor(b / 2);
        g = Math.floor(g / 2);
    }

    y += g;
    b += g;

    const maxRYB = Math.max(r, y, b);
    if (maxRYB > 0) {
        const factor = maxG / maxRYB;
        r = Math.round(r * factor);
        y = Math.round(y * factor);
        b = Math.round(b * factor);
    }

    r += white;
    y += white;
    b += white;

    return [r, y, b];
}

function createComponent(type, options = {}) {
    const component = {
        id: nextId('c'),
        type,
        color: options.color || null,
        x: options.x ?? 80,
        y: options.y ?? 80,
        ports: [],
        element: null,
        storageSlots: type === 'storage' ? {} : null,
        mode: options.mode || null,
        inventoryPanel: null
    };

    const el = document.createElement('div');
    el.className = `component ${type}`;
    el.dataset.id = component.id;

    const header = document.createElement('div');
    header.className = 'component-header';

    const title = document.createElement('div');
    title.className = 'component-title';

    const chip = document.createElement('div');
    chip.className = 'color-chip';
    chip.style.background = component.color ? rgbToString(component.color) : '#f1f5f9';

    const label = document.createElement('span');
    label.textContent = getComponentLabel(component);

    const typeBadge = document.createElement('span');
    typeBadge.className = 'component-type';
    typeBadge.textContent = type.toUpperCase();

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'X';
    deleteBtn.title = 'Delete component';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteComponent(component.id);
    });

    title.appendChild(chip);
    title.appendChild(label);
    header.appendChild(title);
    header.appendChild(typeBadge);
    header.appendChild(deleteBtn);

    const body = document.createElement('div');
    body.className = 'component-body';

    const leftCol = document.createElement('div');
    leftCol.className = 'port-column';
    const rightCol = document.createElement('div');
    rightCol.className = 'port-column';
    const center = document.createElement('div');
    center.className = 'component-center';

    body.appendChild(leftCol);
    body.appendChild(center);
    body.appendChild(rightCol);

    el.appendChild(header);
    el.appendChild(body);

    component.element = el;
    gridBoard.appendChild(el);

    buildPorts(component, leftCol, rightCol, center);
    setComponentPosition(component, component.x, component.y);
    setupDragging(component, header);

    components.push(component);
    return component;
}

function getComponentLabel(component) {
    if (component.type === 'factory' && component.color) {
        const [r, g, b] = component.color;
        if (r === 255 && g === 0 && b === 0) return 'Red Factory';
        if (r === 255 && g === 255 && b === 0) return 'Yellow Factory';
        if (r === 0 && g === 0 && b === 255) return 'Blue Factory';
        return 'Mixed Factory';
    }
    if (component.type === 'adder') return 'Adder (mix 2 → 1)';
    if (component.type === 'gradientor') {
        return component.mode === 'darken' ? 'Darkener' : 'Brightener';
    }
    if (component.type === 'storage') return 'Storage Container';
    return 'Component';
}

function buildPorts(component, leftCol, rightCol, center) {
    if (component.type === 'factory') {
        for (let i = 0; i < 4; i += 1) {
            addPort(component, rightCol, 'output', 'right', `Output ${i + 1}`);
        }
        const info = document.createElement('div');
        info.className = 'port-label';
        info.textContent = 'Outputs carry base color';
        center.appendChild(info);
    } else if (component.type === 'adder') {
        addPort(component, leftCol, 'input', 'left', 'Input A');
        addPort(component, leftCol, 'input', 'left', 'Input B');
        addPort(component, rightCol, 'output', 'right', 'Mixed Output');
        const symbol = document.createElement('div');
        symbol.className = 'port-label';
        symbol.textContent = 'Adder';
        center.appendChild(symbol);
    } else if (component.type === 'gradientor') {
        addPort(component, leftCol, 'input', 'left', 'Color In');
        addPort(component, rightCol, 'output', 'right', 'Adjusted Out');
        const note = document.createElement('div');
        note.className = 'port-label';
        note.textContent = component.mode === 'darken' ? 'Darken' : 'Brighten';
        center.appendChild(note);
    } else if (component.type === 'storage') {
        for (let i = 0; i < 3; i += 1) {
            addPort(component, leftCol, 'flex', 'left', `Port ${i + 1}`);
        }
        for (let i = 3; i < 6; i += 1) {
            addPort(component, rightCol, 'flex', 'right', `Port ${i + 1}`);
        }
        const note = document.createElement('div');
        note.className = 'port-label';
        note.textContent = 'Store or forward';
        center.appendChild(note);

        const inventoryBtn = document.createElement('button');
        inventoryBtn.type = 'button';
        inventoryBtn.className = 'inventory-btn';
        inventoryBtn.textContent = 'Inventory';
        inventoryBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (component.inventoryPanel) {
                component.inventoryPanel.classList.toggle('open');
            }
        });
        center.appendChild(inventoryBtn);

        const inventoryPanel = document.createElement('div');
        inventoryPanel.className = 'inventory-panel';
        center.appendChild(inventoryPanel);
        component.inventoryPanel = inventoryPanel;
    }
}

function addPort(component, container, role, side, title) {
    const portId = nextId('p');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `port ${role}`;
    button.dataset.componentId = component.id;
    button.dataset.portId = portId;
    button.dataset.role = role;
    button.dataset.side = side;
    button.title = title;
    button.addEventListener('click', handlePortClick);
    container.appendChild(button);

    component.ports.push({
        id: portId,
        role,
        side,
        element: button
    });

    return button;
}

function handlePortClick(event) {
    event.stopPropagation();
    const portEl = event.currentTarget;
    const portRef = {
        componentId: portEl.dataset.componentId,
        portId: portEl.dataset.portId
    };

    if (!selectedPort) {
        selectedPort = portRef;
        portEl.classList.add('selected');
        return;
    }

    if (selectedPort.componentId === portRef.componentId) {
        clearSelection();
        return;
    }

    const resolved = resolveConnection(selectedPort, portRef);
    if (!resolved) {
        clearSelection();
        return;
    }

    if (connectionExists(resolved.from, resolved.to)) {
        clearSelection();
        return;
    }

    connections.push({
        id: nextId('link'),
        from: resolved.from,
        to: resolved.to
    });

    clearSelection();
    renderConnections();
    computeColors();
}

function resolveConnection(firstRef, secondRef) {
    const firstPort = getPort(firstRef);
    const secondPort = getPort(secondRef);
    if (!firstPort || !secondPort) return null;

    const firstRole = firstPort.role;
    const secondRole = secondPort.role;

    const toRef = (from, to) => ({ from, to });

    const canAccept = (toPortRef) => !connections.some(conn => conn.to.componentId === toPortRef.componentId && conn.to.portId === toPortRef.portId);
    const canSend = (fromPortRef, fromPort) => {
        const sourceComponent = components.find(c => c.id === fromPortRef.componentId);
        const isAdderOutput = sourceComponent && sourceComponent.type === 'adder' && fromPort.role === 'output';
        const isGradientorOutput = sourceComponent && sourceComponent.type === 'gradientor' && fromPort.role === 'output';
        if (isAdderOutput || isGradientorOutput) return true;
        return !connections.some(conn => conn.from.componentId === fromPortRef.componentId && conn.from.portId === fromPortRef.portId);
    };

    if (firstRole === 'output' && secondRole === 'input') {
        if (!canAccept(secondRef) || !canSend(firstRef, firstPort)) return null;
        return toRef(firstRef, secondRef);
    }
    if (firstRole === 'input' && secondRole === 'output') {
        if (!canAccept(firstRef) || !canSend(secondRef, secondPort)) return null;
        return toRef(secondRef, firstRef);
    }

    if (firstRole === 'output' && secondRole === 'flex') {
        if (!canAccept(secondRef) || !canSend(firstRef, firstPort)) return null;
        return toRef(firstRef, secondRef);
    }
    if (firstRole === 'flex' && secondRole === 'output') {
        if (!canAccept(firstRef) || !canSend(secondRef, secondPort)) return null;
        return toRef(secondRef, firstRef);
    }

    if (firstRole === 'input' && secondRole === 'flex') {
        if (!canAccept(firstRef) || !canSend(secondRef, secondPort)) return null;
        return toRef(secondRef, firstRef);
    }
    if (firstRole === 'flex' && secondRole === 'input') {
        if (!canAccept(secondRef) || !canSend(firstRef, firstPort)) return null;
        return toRef(firstRef, secondRef);
    }

    if (firstRole === 'flex' && secondRole === 'flex') {
        if (!canAccept(secondRef) || !canSend(firstRef, firstPort)) return null;
        return toRef(firstRef, secondRef);
    }

    return null;
}

function connectionExists(fromRef, toRef) {
    return connections.some(conn => conn.from.componentId === fromRef.componentId && conn.from.portId === fromRef.portId && conn.to.componentId === toRef.componentId && conn.to.portId === toRef.portId);
}

function clearSelection() {
    if (selectedPort) {
        const el = getPortElement(selectedPort);
        if (el) el.classList.remove('selected');
    }
    selectedPort = null;
}

function getPort(ref) {
    const component = components.find(c => c.id === ref.componentId);
    if (!component) return null;
    return component.ports.find(p => p.id === ref.portId) || null;
}

function getPortElement(ref) {
    const port = getPort(ref);
    return port ? port.element : null;
}

function setComponentPosition(component, x, y) {
    const rect = gridBoard.getBoundingClientRect();
    const width = component.element.offsetWidth;
    const height = component.element.offsetHeight;

    const clampedX = Math.max(8, Math.min(x, rect.width - width - 8));
    const clampedY = Math.max(8, Math.min(y, rect.height - height - 8));

    component.x = clampedX;
    component.y = clampedY;
    component.element.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
}

function setupDragging(component, dragHandle) {
    dragHandle.style.cursor = 'grab';

    const onPointerDown = (event) => {
        if (event.target && event.target.closest('.delete-btn')) return;
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();
        dragHandle.setPointerCapture(event.pointerId);
        component.element.classList.add('dragging');

        const startX = event.clientX;
        const startY = event.clientY;
        const initialX = component.x;
        const initialY = component.y;

        const onMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            setComponentPosition(component, initialX + dx, initialY + dy);
            renderConnections();
        };

        const onUp = (upEvent) => {
            dragHandle.releasePointerCapture(upEvent.pointerId);
            component.element.classList.remove('dragging');
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            renderConnections();
            computeColors();
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    dragHandle.addEventListener('pointerdown', onPointerDown);
}

function getPortCenter(port) {
    const portRect = port.element.getBoundingClientRect();
    const boardRect = gridBoard.getBoundingClientRect();
    return {
        x: portRect.left - boardRect.left + portRect.width / 2,
        y: portRect.top - boardRect.top + portRect.height / 2
    };
}

function renderConnections() {
    const rect = gridBoard.getBoundingClientRect();
    connectionLayer.setAttribute('width', rect.width);
    connectionLayer.setAttribute('height', rect.height);
    connectionLayer.innerHTML = '';

    connections.forEach(conn => {
        const fromPort = getPort(conn.from);
        const toPort = getPort(conn.to);
        if (!fromPort || !toPort) return;

        const fromPos = getPortCenter(fromPort);
        const toPos = getPortCenter(toPort);

        const delta = Math.max(60, Math.abs(fromPos.x - toPos.x) / 2);
        const pathData = `M ${fromPos.x} ${fromPos.y} C ${fromPos.x + delta} ${fromPos.y} ${toPos.x - delta} ${toPos.y} ${toPos.x} ${toPos.y}`;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('class', 'connection-line');
        connectionLayer.appendChild(path);
    });
}

function colorsEqual(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

function computeColors() {
    const portOutputs = new Map();
    let changed = true;
    let guard = 0;

    while (changed && guard < 8) {
        changed = false;
        guard += 1;

        components.forEach(component => {
            if (component.type === 'factory') {
                const outputs = component.ports.filter(p => p.role === 'output');
                outputs.forEach(port => {
                    if (setPortOutput(portOutputs, portKey({ componentId: component.id, portId: port.id }), component.color)) {
                        changed = true;
                    }
                });
            } else if (component.type === 'adder') {
                const inputPorts = component.ports.filter(p => p.role === 'input');
                const inputColors = inputPorts
                    .map(port => {
                        const inbound = connections.find(conn => conn.to.componentId === component.id && conn.to.portId === port.id);
                        if (!inbound) return null;
                        return portOutputs.get(portKey(inbound.from)) || null;
                    })
                    .filter(Boolean);

                const outputPorts = component.ports.filter(p => p.role === 'output');
                let outColor = null;
                if (inputColors.length >= 2) {
                    outColor = mixColors(inputColors[0], inputColors[1]);
                }
                outputPorts.forEach(port => {
                    if (setPortOutput(portOutputs, portKey({ componentId: component.id, portId: port.id }), outColor)) {
                        changed = true;
                    }
                });
            } else if (component.type === 'gradientor') {
                const inputPort = component.ports.find(p => p.role === 'input');
                const outputPort = component.ports.find(p => p.role === 'output');
                let inboundColor = null;
                if (inputPort) {
                    const inbound = connections.find(conn => conn.to.componentId === component.id && conn.to.portId === inputPort.id);
                    inboundColor = inbound ? (portOutputs.get(portKey(inbound.from)) || null) : null;
                }
                const adjusted = adjustColor(inboundColor, component.mode === 'darken' ? 'darken' : 'lighten');
                if (outputPort) {
                    if (setPortOutput(portOutputs, portKey({ componentId: component.id, portId: outputPort.id }), adjusted)) {
                        changed = true;
                    }
                }
            } else if (component.type === 'storage') {
                component.storageSlots = component.storageSlots || {};

                component.ports.forEach(port => {
                    if (port.role !== 'flex') return;
                    const inbound = connections.find(conn => conn.to.componentId === component.id && conn.to.portId === port.id);
                    const inboundColor = inbound ? (portOutputs.get(portKey(inbound.from)) || null) : null;
                    const prev = component.storageSlots[port.id] || null;
                    if (!colorsEqual(prev, inboundColor)) {
                        component.storageSlots[port.id] = inboundColor;
                        changed = true;
                    }
                });

                component.ports.forEach(port => {
                    if (port.role !== 'flex') return;
                    const stored = component.storageSlots[port.id] || null;
                    if (setPortOutput(portOutputs, portKey({ componentId: component.id, portId: port.id }), stored)) {
                        changed = true;
                    }
                });
            }
        });
    }

    updatePortsWithColors(portOutputs);
    updateStorageWarnings();
}

function updatePortsWithColors(portOutputs) {
    components.forEach(component => {
        let chipColor = null;
        if (component.type === 'factory') {
            chipColor = component.color;
        } else if (component.type === 'adder') {
            const outPort = component.ports.find(p => p.role === 'output');
            if (outPort) {
                chipColor = portOutputs.get(portKey({ componentId: component.id, portId: outPort.id })) || null;
            }
        } else if (component.type === 'gradientor') {
            const outPort = component.ports.find(p => p.role === 'output');
            if (outPort) {
                chipColor = portOutputs.get(portKey({ componentId: component.id, portId: outPort.id })) || null;
            }
        } else if (component.type === 'storage') {
            const slotColors = component.ports
                .map(p => (component.storageSlots ? component.storageSlots[p.id] : null))
                .filter(Boolean);
            chipColor = slotColors.length ? slotColors[0] : null;
        }

        const chip = component.element.querySelector('.color-chip');
        if (chip) {
            chip.style.background = chipColor ? rgbToString(chipColor) : '#f1f5f9';
        }

        component.ports.forEach(port => {
            const el = port.element;
            el.classList.remove('has-color');
            el.style.setProperty('--port-color', '');

            const inboundConn = connections.find(conn => conn.to.componentId === component.id && conn.to.portId === port.id);
            const inboundColor = inboundConn ? (portOutputs.get(portKey(inboundConn.from)) || null) : null;
            const storedColor = component.type === 'storage' && component.storageSlots ? (component.storageSlots[port.id] || null) : null;
            const outgoingColor = portOutputs.get(portKey({ componentId: component.id, portId: port.id })) || null;

            const portColor = storedColor || inboundColor || outgoingColor || null;

            if (portColor) {
                el.classList.add('has-color');
                el.style.setProperty('--port-color', rgbToString(portColor));
            }
        });

        if (component.type === 'storage' && component.inventoryPanel) {
            updateStorageInventory(component);
        }
    });
}

function updateStorageInventory(component) {
    const panel = component.inventoryPanel;
    if (!panel) return;
    panel.innerHTML = '';
    component.ports
        .filter(p => p.role === 'flex')
        .forEach(port => {
            const row = document.createElement('div');
            row.className = 'inventory-row';
            const label = document.createElement('span');
            label.textContent = port.element.title || 'Port';
            const swatch = document.createElement('div');
            swatch.className = 'inventory-swatch';
            const stored = component.storageSlots ? component.storageSlots[port.id] : null;
            if (stored) {
                swatch.style.background = rgbToString(stored);
            }
            row.appendChild(label);
            row.appendChild(swatch);
            panel.appendChild(row);
        });
}

function isPortOutput(port, component) {
    if (port.role === 'output') return true;
    if (port.role === 'flex') {
        return connections.some(conn => conn.from.componentId === component.id && conn.from.portId === port.id);
    }
    return false;
}

function updateStorageWarnings() {
    components.forEach(component => {
        if (component.type !== 'storage') return;
        const inbound = connections.filter(conn => conn.to.componentId === component.id);
        const outbound = connections.filter(conn => conn.from.componentId === component.id);
        let warning = component.element.querySelector('.warning-text');
        if (!inbound.length || !outbound.length) {
            if (!warning) {
                warning = document.createElement('div');
                warning.className = 'warning-text';
                component.element.appendChild(warning);
            }
            warning.textContent = 'Storage needs in + out links';
        } else if (warning) {
            warning.remove();
        }
    });
}

function deleteComponent(componentId) {
    const idx = components.findIndex(c => c.id === componentId);
    if (idx === -1) return;
    const component = components[idx];

    if (selectedPort && selectedPort.componentId === componentId) {
        clearSelection();
    }

    connections = connections.filter(conn => conn.from.componentId !== componentId && conn.to.componentId !== componentId);

    if (component.element && component.element.remove) {
        component.element.remove();
    }
    components.splice(idx, 1);

    renderConnections();
    computeColors();
}

function resetGrid() {
    connections = [];
    components.forEach(c => c.element.remove());
    components = [];
    connectionLayer.innerHTML = '';

    computeColors();
    renderConnections();
}

function handleToolbarClick(event) {
    const button = event.target.closest('.toolbar-btn');
    if (!button) return;
    const addType = button.dataset.add;

    if (addType === 'factory') {
        const color = parseColor(button.dataset.color);
        createComponent('factory', { color, x: 120 + Math.random() * 80, y: 60 + Math.random() * 220 });
    } else if (addType === 'adder') {
        createComponent('adder', { x: 280 + Math.random() * 160, y: 80 + Math.random() * 240 });
    } else if (addType === 'gradientor') {
        const mode = button.dataset.mode === 'darken' ? 'darken' : 'lighten';
        createComponent('gradientor', { mode, x: 320 + Math.random() * 140, y: 140 + Math.random() * 200 });
    } else if (addType === 'storage') {
        createComponent('storage', { x: 520 + Math.random() * 120, y: 100 + Math.random() * 220 });
    }

    computeColors();
    renderConnections();
}

function onResize() {
    renderConnections();
}

function init() {
    toolbar.addEventListener('click', handleToolbarClick);
    resetButton.addEventListener('click', resetGrid);
    window.addEventListener('resize', onResize);
    resetGrid();
}

document.addEventListener('DOMContentLoaded', init);
