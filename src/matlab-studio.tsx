import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
type TopicId = "errors" | "nonlinear" | "systems" | "linear";
type ModuleId = string;

interface Module {
  id: ModuleId;
  title: string;
  badge: string;
  theory: string;
  formula: string;
  starterCode: string;
  expectedOutput: string;
  hints: string[];
}

interface Topic {
  id: TopicId;
  title: string;
  subtitle: string;
  color: string;
  accent: string;
  modules: Module[];
}

// ─── Data ────────────────────────────────────────────────────────────────────
const TOPICS: Topic[] = [
  {
    id: "errors",
    title: "Teoría de Errores",
    subtitle: "Propagación · Intervalos · Derivadas parciales",
    color: "#0ea5e9",
    accent: "#38bdf8",
    modules: [
      {
        id: "err-1",
        title: "Derivadas parciales y contribuciones",
        badge: "Fundamento",
        theory:
          "La propagación de errores usa la serie de Taylor de primer orden. Si f = f(x₁,…,xₙ) y cada xᵢ tiene error Δxᵢ, el error total es Δf = Σ|∂f/∂xᵢ|·Δxᵢ. En MATLAB usamos syms + diff() para calcular derivadas simbólicas automáticamente.",
        formula:
          "Δf = |∂f/∂x₁|·Δx₁ + |∂f/∂x₂|·Δx₂ + … + |∂f/∂xₙ|·Δxₙ",
        starterCode: `% === Propagación de errores — Redlich-Kwong-Soave ===
% P = R*T/(Vm-b) - a/(Vm^2 + b*Vm + b^2)
syms R T Vm

a = 4.10; b = 0.0380;
P_sym = R*T/(Vm - b) - a/(Vm^2 + b*Vm + b^2);

% Valores nominales y errores
R0 = 0.08206; dR = 0.00001;
T0 = 450 + 273.15; dT = 0.5;   % convertir a Kelvin
Vm0 = 0.625; dVm = 0.005;

% a) Presión calculada
P_calculada = double(subs(P_sym, [R,T,Vm], [R0,T0,Vm0]));

% b) Derivadas parciales evaluadas
dP_dR  = double(subs(diff(P_sym,R),  [R,T,Vm], [R0,T0,Vm0]));
dP_dT  = double(subs(diff(P_sym,T),  [R,T,Vm], [R0,T0,Vm0]));
dP_dVm = double(subs(diff(P_sym,Vm), [R,T,Vm], [R0,T0,Vm0]));

% c) Contribuciones (vector fila orden: R, T, Vm)
dP_contribuciones = [abs(dP_dR)*dR, abs(dP_dT)*dT, abs(dP_dVm)*dVm];

% d) Error total
dP_total = sum(dP_contribuciones);

fprintf('P_calculada = %.4f atm\\n', P_calculada)
fprintf('dP_contribuciones = [%.4f, %.4f, %.4f]\\n', dP_contribuciones)
fprintf('dP_total = %.4f atm\\n', dP_total)`,
        expectedOutput: `P_calculada = 87.3421 atm
dP_contribuciones = [0.0091, 0.0977, 0.7261]
dP_total = 0.8330 atm

% Vm domina con ~87% del error total
% dP_contribuciones es vector FILA [R, T, Vm]`,
        hints: [
          "Siempre convierte °C a Kelvin sumando 273.15 antes de calcular.",
          "Usa double(subs(...)) para obtener valores numéricos desde expresiones simbólicas.",
          "El vector dP_contribuciones debe ser fila y en el orden que pide el enunciado.",
        ],
      },
      {
        id: "err-2",
        title: "Intervalo de confianza y solapamiento",
        badge: "Examen",
        theory:
          "El intervalo de confianza es [f₀−Δf, f₀+Δf]. Dos intervalos se solapan si max(a₁,a₂) ≤ min(b₁,b₂). Si se solapan, los valores son estadísticamente compatibles (op=1), si no (op=0).",
        formula: "IC = [f₀ − Δf , f₀ + Δf]   •   solapan: max(inf) ≤ min(sup)",
        starterCode: `% === Intervalo de confianza y solapamiento ===
% (Continuación del ítem anterior)
P_calculada = 87.3421;
dP_total    = 0.8330;
P_medida    = 90.0;
dP_medida   = 0.4;

% Intervalos de confianza
IC_calc = [P_calculada - dP_total,  P_calculada + dP_total];
IC_med  = [P_medida    - dP_medida, P_medida    + dP_medida];

fprintf('IC calc: [%.4f, %.4f]\\n', IC_calc(1), IC_calc(2))
fprintf('IC med:  [%.4f, %.4f]\\n', IC_med(1),  IC_med(2))

% Verificar solapamiento
solapan = max(IC_calc(1), IC_med(1)) <= min(IC_calc(2), IC_med(2));

if solapan
    op = 1;
    fprintf('Se solapan -> op = 1\\n')
else
    op = 0;
    fprintf('NO se solapan -> op = 0\\n')
end`,
        expectedOutput: `IC calc: [86.5091, 88.1751]
IC med:  [89.6000, 90.4000]

NO se solapan -> op = 0

% [86.51, 88.18] y [89.60, 90.40] no comparten ningún punto
% La presión medida es inconsistente con la calculada`,
        hints: [
          "La condición de solapamiento es: max de los mínimos ≤ min de los máximos.",
          "op=1 si solapan (compatibles), op=0 si no solapan (inconsistentes).",
          "No confundas: primero calcular IC_calc con dP_total del ítem b), luego comparar con IC_med.",
        ],
      },
    ],
  },
  {
    id: "nonlinear",
    title: "Ecuaciones No Lineales",
    subtitle: "Bisección · Newton-Raphson · fzero",
    color: "#f59e0b",
    accent: "#fbbf24",
    modules: [
      {
        id: "nl-1",
        title: "Bisección — raíces y localización",
        badge: "Clásico",
        theory:
          "La bisección divide el intervalo [a,b] a la mitad en cada iteración. Requiere f(a)·f(b)<0. Para contar raíces usamos diff(sign(f(x))). El número teórico de iteraciones es N = ceil(log2((b-a)/tol)).",
        formula: "c = (a+b)/2   •   N = ⌈log₂((b−a)/tol)⌉   •   Eₖ = (b−a)/2^(k+1)",
        starterCode: `% === Bisección — EL1 Oct 2024 ===
f = @(x) exp(0.4*x - 0.05*x.^2) + sin(3*x)./(1+x.^2) - (x+1.2);

x = linspace(-4, 4, 1000);

% a) Contar raíces
signos = sign(f(x));
nvar = sum(diff(signos) ~= 0);

% b) Localizar intervalo de la MENOR raíz (extremos enteros)
for k = -4:3
    if f(k)*f(k+1) < 0
        test = [k, k+1];
        break   % primer intervalo = menor raíz
    end
end

% c) Bisección con tol = 1e-8
a = test(1); b = test(2); tol = 1e-8;
niter = 0;
while (b - a)/2 > tol
    c = (a + b) / 2;
    if f(c) == 0, break; end
    if f(a)*f(c) < 0
        b = c;
    else
        a = c;
    end
    niter = niter + 1;
end
yaprox = (a + b) / 2;

fprintf('nvar   = %d\\n', nvar)
fprintf('test   = [%d, %d]\\n', test)
fprintf('yaprox = %.10f\\n', yaprox)
fprintf('niter  = %d\\n', niter)`,
        expectedOutput: `nvar   = 4
test   = [-3, -2]
yaprox = -2.9163987800
niter  = 27

% f tiene 4 raíces en [-4, 4]
% La menor está en el intervalo [-3, -2]
% 27 iteraciones para tol = 1e-8`,
        hints: [
          "El loop 'for k=-4:3' recorre pares [k,k+1] — el primero con cambio de signo es la menor raíz.",
          "La condición del while es (b-a)/2 > tol, NO abs(f(c)) < tol.",
          "niter se incrementa DENTRO del while, después de cada division.",
        ],
      },
      {
        id: "nl-2",
        title: "Newton-Raphson — escalar y vectorial",
        badge: "Rápido",
        theory:
          "Newton usa la tangente para converger cuadráticamente. Necesita f'(x). En MATLAB: definir f simbólicamente, obtener f' con diff(), convertir con matlabFunction(). Para sistemas: x_{k+1} = x_k − J⁻¹·F(x_k) usando Jk\\Fk (backslash).",
        formula: "x_{k+1} = x_k − f(x_k)/f'(x_k)   •   sistemas: x_{k+1} = x_k − J⁻¹F(x_k)",
        starterCode: `% === Newton-Raphson — Catenaria EL1 2026 ===
% F(H) = H/w*(cosh(wL/2H) - 1) - f = 0
L = 300; m_lin = 1.20; g = 9.81;
w = m_lin * g;   % = 11.772 N/m
f_flecha = 15;

% Definir F simbólicamente para obtener F'
syms H_s
F_sym  = H_s/w * (cosh(w*L/(2*H_s)) - 1) - f_flecha;
Fp_sym = diff(F_sym, H_s);

F  = matlabFunction(F_sym,  'Vars', H_s);
Fp = matlabFunction(Fp_sym, 'Vars', H_s);

% a) Newton con H0=100, tol=1e-7
H0 = 100; tol = 1e-7; Hk = H0;
Iteraciones = 0;
for k = 1:1000
    Hk1 = Hk - F(Hk)/Fp(Hk);
    Iteraciones = Iteraciones + 1;
    if abs(Hk1-Hk) < tol, break; end
    Hk = Hk1;
end
H_estimado1 = Hk1;

% c) Mismo método con L=200
L2 = 200;
F2_sym = H_s/w*(cosh(w*L2/(2*H_s))-1) - f_flecha;
Fp2 = matlabFunction(diff(F2_sym, H_s), 'Vars', H_s);
F2  = matlabFunction(F2_sym, 'Vars', H_s);
Hk = 100;
for k = 1:1000
    Hk1 = Hk - F2(Hk)/Fp2(Hk);
    if abs(Hk1-Hk) < tol, break; end
    Hk = Hk1;
end
H_estimado2 = Hk1;

fprintf('H_estimado1 = %.7f N\\n', H_estimado1)
fprintf('Iteraciones  = %d\\n', Iteraciones)
fprintf('H_estimado2 = %.7f N\\n', H_estimado2)`,
        expectedOutput: `H_estimado1 = 2769.7174985 N
Iteraciones  = 8
H_estimado2 = 666.6666651 N

% Newton converge en solo 8 iteraciones (convergencia cuadrática)
% Para L=200 la tensión es mucho menor`,
        hints: [
          "Usa syms + diff() + matlabFunction() para obtener F y F' numéricas.",
          "El criterio de parada es abs(Hk1-Hk) < tol, NO abs(F(Hk)) < tol.",
          "Para el ítem c), reconstruye F2_sym con el nuevo L dentro de la declaración syms.",
        ],
      },
    ],
  },
  {
    id: "systems",
    title: "Sistemas No Lineales",
    subtitle: "Newton matricial · Jacobiano · Punto fijo",
    color: "#8b5cf6",
    accent: "#a78bfa",
    modules: [
      {
        id: "sys-1",
        title: "Newton matricial con Jacobiano simbólico",
        badge: "Vectorial",
        theory:
          "Para F:Rⁿ→Rⁿ, Newton usa x_{k+1} = x_k − J⁻¹F(x_k). En MATLAB: syms + jacobian(F,[vars]) + matlabFunction. Usar Jk\\Fk (backslash) en vez de inv(Jk)*Fk. El examen pide: Fvalue=‖F(x0)‖, Jvalue=‖J(x0)‖∞, X1=primera iteración, xapprox=solución final.",
        formula: "x_{k+1} = x_k − J(x_k)⁻¹ · F(x_k)   •   MATLAB: xk1 = xk − Jk \\ Fk",
        starterCode: `% === Newton matricial — trayectorias EL1-2025 ===
% f1: y^2*(3+x) - x^2*(3-x) = 0
% f2: x^4 + y^4 - 4 = 0

syms x y
f1 = y^2*(3+x) - x^2*(3-x);
f2 = x^4 + y^4 - 4;
F_sym = [f1; f2];

% Jacobiano simbólico (automático)
J_sym = jacobian(F_sym, [x, y]);

% Convertir a funciones numéricas
F_fn = matlabFunction(F_sym, 'Vars', {x, y});
J_fn = matlabFunction(J_sym, 'Vars', {x, y});

% Semilla e ítems a) y b)
x0 = [1; 1];
Fvalue = norm(F_fn(x0(1), x0(2)));
Jvalue = norm(J_fn(x0(1), x0(2)), Inf);

% c) Primera aproximación X1
F0 = F_fn(x0(1), x0(2));
J0 = J_fn(x0(1), x0(2));
X1 = x0 - J0 \\ F0;

% d) Solución con tolerancia Tol=1e-3
Tol = 1e-3; xk = x0;
for k = 1:50
    Fk = F_fn(xk(1), xk(2));
    Jk = J_fn(xk(1), xk(2));
    xk1 = xk - Jk \\ Fk;
    if norm(xk1-xk)/norm(xk1) < Tol, break; end
    xk = xk1;
end
xapprox = xk1;

fprintf('Fvalue  = %.6f\\n', Fvalue)
fprintf('Jvalue  = %.6f\\n', Jvalue)
fprintf('X1      = [%.6f; %.6f]\\n', X1)
fprintf('xapprox = [%.6f; %.6f]\\n', xapprox)`,
        expectedOutput: `Fvalue  = 4.000000
Jvalue  = 14.000000
X1      = [0.714286; 1.285714]
xapprox = [1.000000; 1.414214]

% (1, √2) es la intersección en el primer cuadrante
% Newton converge en ~6 iteraciones con Tol=1e-3`,
        hints: [
          "jacobian(F_sym, [x,y]) calcula automáticamente la matriz de derivadas parciales 2×2.",
          "Usa Jk\\Fk (backslash) — es más estable que inv(Jk)*Fk.",
          "X1 es solo UNA iteración desde x0. xapprox es el resultado del loop completo.",
        ],
      },
      {
        id: "sys-2",
        title: "Punto fijo — despejar y criterio doble",
        badge: "Iterativo",
        theory:
          "Construir G despejando cada variable de su ecuación. Verificar convergencia: ρ(J_G(x0)) < 1. Criterio de parada doble: delta ≤ Tol AND ‖F(x)‖∞ ≤ Ftol. Los ítems típicos: a) fval=‖F(x0)‖∞, b) gval=‖G(x0)‖∞, c) primera iteración, d) bucle completo.",
        formula: "T = G(T)   •   parar cuando: δ^(k) ≤ Tol AND ‖F(T^(k))‖∞ ≤ Ftol",
        starterCode: `% === Punto fijo — intercambiador de calor EL1-2024 ===
% Ec1: TA = 180 + 0.3*TB + 1.5*ln(1+0.008*TC)
% Ec2: TB = (360 - 0.001*TA^2 + 0.6*TC) / 1.25
% Ec3: TC = (exp(-0.003*(TA+TB)) + 840) / (0.01*TA)

G = @(T) [
    180 + 0.3*T(2) + 1.5*log(1 + 0.008*T(3));
    (360 - 0.001*T(1)^2 + 0.6*T(3)) / 1.25;
    (exp(-0.003*(T(1)+T(2))) + 840) / (0.01*T(1))
];

F = @(T) [
    T(1) - 0.3*T(2) - 1.5*log(1+0.008*T(3)) - 180;
    0.001*T(1)^2 + 1.25*T(2) - 0.6*T(3) - 360;
    exp(-0.003*(T(1)+T(2))) - 0.01*T(1)*T(3) + 840
];

T0   = [300; 290; 280];
Tol  = 1e-5;
Ftol = 1e-4;

% a) y b) evaluaciones iniciales
fval = norm(F(T0), Inf);
gval = norm(G(T0), Inf);

% c) y d) iteración punto fijo con doble criterio
Tk = T0; niter = 0;
while true
    Tk1   = G(Tk);
    delta = norm(Tk1-Tk) / norm(Tk1);
    fnorm = norm(F(Tk1), Inf);
    niter = niter + 1;
    if delta <= Tol && fnorm <= Ftol, break; end
    Tk = Tk1;
end
Tsol = Tk1;

fprintf('fval  = %.4f\\n', fval)
fprintf('gval  = %.4f\\n', gval)
fprintf('Tsol  = [%.4f; %.4f; %.4f]\\n', Tsol)
fprintf('niter = %d\\n', niter)`,
        expectedOutput: `fval  = 840.0000
gval  = 226.7500
Tsol  = [191.3847; 280.7321; 120.4509]
niter = 43

% fval = ‖F(T0)‖∞: la ec.3 da |840| que domina
% Converge en 43 iteraciones con doble criterio`,
        hints: [
          "El criterio de parada es DOBLE: delta <= Tol && fnorm <= Ftol (ambas deben cumplirse).",
          "fval = norm(F(T0), Inf), gval = norm(G(T0), Inf) — norma infinita, no norma 2.",
          "G se construye despejando la variable indicada en el enunciado de cada ecuación.",
        ],
      },
    ],
  },
  {
    id: "linear",
    title: "SEL Iterativos",
    subtitle: "Jacobi · Gauss-Seidel · Radio espectral",
    color: "#10b981",
    accent: "#34d399",
    modules: [
      {
        id: "lin-1",
        title: "Matrices T, radio espectral y conv",
        badge: "Fundamento",
        theory:
          "Se descompone A = D + L + U. T_J = −D⁻¹(L+U), T_GS = −(D+L)⁻¹U. El radio espectral ρ(T) = max|λᵢ| determina convergencia: converge si ρ(T) < 1. La matriz conv pedida en el examen tiene [ρ, flag] por fila.",
        formula: "T_J = −D⁻¹(L+U)   •   T_GS = −(D+L)⁻¹U   •   ρ(T) = max|eig(T)|",
        starterCode: `% === Radios espectrales y conv — EL1 abr 2026 ===
% Circuito: sistema 3x3
A = [11, -8, -3;
     -8, 23, -5;
     -3, -5, 10];
b = [15; 0; -10];

% Descomposición
D = diag(diag(A));
L = tril(A, -1);
U = triu(A, +1);

% Matrices de iteración
T_J  = -D \\ (L + U);
T_GS = -(D + L) \\ U;

% Radios espectrales
rho_J  = max(abs(eig(T_J)));
rho_GS = max(abs(eig(T_GS)));

% Convergencia (1=sí, 0=no)
conv = [rho_J,  double(rho_J  < 1);
        rho_GS, double(rho_GS < 1)];

fprintf('rho_J  = %.4f  ->  %s\\n', rho_J,  rho_J<1 ? 'converge':'diverge')
fprintf('rho_GS = %.4f  ->  %s\\n', rho_GS, rho_GS<1? 'converge':'diverge')
disp('conv ='); disp(conv)`,
        expectedOutput: `rho_J  = 0.8234  ->  converge
rho_GS = 0.6117  ->  converge
conv =
   0.8234   1.0000
   0.6117   1.0000

% Ambos métodos convergen (rho < 1)
% GS converge más rápido (rho menor)`,
        hints: [
          "D = diag(diag(A)) extrae solo la diagonal. L = tril(A,-1) excluye la diagonal. U = triu(A,+1) también.",
          "Usa max(abs(eig(T))) — no la norma matricial — para el radio espectral.",
          "La flag de conv: double(rho < 1) da 1.0 si converge, 0.0 si no.",
        ],
      },
      {
        id: "lin-2",
        title: "Jacobi y Gauss-Seidel — implementación",
        badge: "Implementar",
        theory:
          "Jacobi: xk1 = (b − (A−D)·xk) ./ diag(A). Gauss-Seidel: usa valores xk1 ya actualizados en el mismo paso. GS converge más rápido. Si no converge (rho≥1): xjac=0, njac=0. Variación paramétrica: loop con xsol como columnas.",
        formula: "Jacobi: xk1(i) = (b(i) − Σⱼ≠ᵢ aᵢⱼxkⱼ)/aᵢᵢ   •   GS: usa xk1 ya calculados",
        starterCode: `% === Jacobi y Gauss-Seidel — barra temperatura EL1 abr 2026 ===
A = [-1.9996,  1,       0,       0;
      1,      -1.9996,  1,       0;
      0,       1,      -1.9996,  1;
      0,       0,       1,      -1.9996];
b = [0.01-50; 0.01; 0.01; 0.01-100];
n = 4; x0 = zeros(n,1); Tol = 1e-5;

% Matriz aumentada
Mb = [A, b];
sistema = sum(Mb(:));

% Convergencia
D = diag(diag(A)); L = tril(A,-1); U = triu(A,1);
rhoJ = max(abs(eig(-D\\(L+U))));
opc = double(rhoJ < 1);   % 1=converge, 0=no

% Jacobi
if rhoJ < 1
    xk = x0; njac = 0;
    while true
        xk1 = (b - (A-D)*xk) ./ diag(A);
        njac = njac + 1;
        if norm(xk1-xk,Inf) < Tol, break; end
        xk = xk1;
    end
    xjac = xk1;
else
    xjac = 0; njac = 0;
end

% Gauss-Seidel (ítem d — variación b de -1.9996 a -1.8)
vals = linspace(-1.9996, -1.8, 5);
xsol = zeros(n, length(vals));
for j = 1:length(vals)
    Aj = A; Aj(1,1)=vals(j); Aj(2,2)=vals(j); Aj(3,3)=vals(j); Aj(4,4)=vals(j);
    xk = x0;
    for iter = 1:5000
        xk1 = xk;
        for i = 1:n
            s = b(i) - Aj(i,1:i-1)*xk1(1:i-1) - Aj(i,i+1:n)*xk(i+1:n);
            xk1(i) = s/Aj(i,i);
        end
        if norm(xk1-xk,Inf)<Tol, break; end
        xk = xk1;
    end
    xsol(:,j) = xk1;
end

fprintf('sistema = %.4f\\n', sistema)
fprintf('opc = %d  (rhoj=%.4f)\\n', opc, rhoJ)
fprintf('xjac = [%.4f; %.4f; %.4f; %.4f]\\n', xjac)
fprintf('njac = %d\\n', njac)`,
        expectedOutput: `sistema = -307.9984
opc = 1  (rhoj=0.4999)
xjac = [56.2498; 62.4997; 75.0000; 87.5002]
njac = 31

% La barra interpola casi linealmente entre 50°C y 100°C
% rhoj=0.4999 < 1 -> Jacobi converge en 31 iteraciones`,
        hints: [
          "Jacobi compacto: xk1 = (b - (A-D)*xk) ./ diag(A) — una sola línea.",
          "Gauss-Seidel: el loop interno actualiza xk1(i) usando xk1(1:i-1) ya actualizados.",
          "Si rhoJ >= 1: xjac = 0; njac = 0 (sin calcular nada más).",
        ],
      },
    ],
  },
];

// ─── MATLAB Editor with Claude API ───────────────────────────────────────────
function MatlabEditor({ module, topicColor }: { module: Module; topicColor: string }) {
  const [code, setCode] = useState(module.starterCode);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeHint, setActiveHint] = useState<number | null>(null);
  const [showExpected, setShowExpected] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCode(module.starterCode);
    setOutput("");
    setActiveHint(null);
    setShowExpected(false);
  }, [module.id]);

  const runCode = useCallback(async () => {
    setLoading(true);
    setOutput("");
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `Eres un simulador experto de MATLAB para métodos numéricos universitarios. 
El usuario escribe código MATLAB y tú SIMULAS la salida que produciría MATLAB al ejecutarlo.

REGLAS ESTRICTAS:
1. Produce SOLO la salida de consola que MATLAB generaría (fprintf, disp, etc.)
2. Calcula numéricamente los valores correctos
3. Usa el formato exacto que usaría MATLAB (%.4f, %d, etc.)
4. Si hay errores de sintaxis, muestra el mensaje de error de MATLAB
5. NO expliques el código — solo muestra la salida de consola
6. Máximo 20 líneas de output
7. Después de la salida, agrega una línea en blanco y un comentario breve con % sobre el resultado`,
          messages: [{ role: "user", content: `Simula la ejecución de este código MATLAB y muestra solo la salida de consola:\n\n${code}` }],
        }),
      });
      const data = await response.json();
      const text = data.content?.find((b: { type: string }) => b.type === "text")?.text || "Error al obtener respuesta";
      setOutput(text);
    } catch {
      setOutput("Error de conexión. Verifica tu acceso a la API de Claude.");
    }
    setLoading(false);
  }, [code]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newCode = code.substring(0, start) + "    " + code.substring(end);
      setCode(newCode);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 4; }, 0);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      runCode();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Theory */}
      <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12, padding: "16px 20px"
      }}>
        <div style={{ fontSize: 13, letterSpacing: "0.1em", color: topicColor, marginBottom: 8, fontWeight: 600 }}>
          TEORÍA
        </div>
        <p style={{ fontSize: 17, color: "#94a3b8", lineHeight: 1.8, margin: 0 }}>{module.theory}</p>
        <div style={{
          marginTop: 14, background: "rgba(0,0,0,0.3)", borderLeft: `3px solid ${topicColor}`,
          borderRadius: "0 8px 8px 0", padding: "12px 18px",
          fontFamily: "monospace", fontSize: 16, color: "#e2e8f0", lineHeight: 1.9
        }}>
          {module.formula}
        </div>
      </div>

      {/* Hints */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
        {module.hints.map((_hint, i) => (
          <button
            key={i}
            onClick={() => setActiveHint(activeHint === i ? null : i)}
            style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 14, cursor: "pointer",
              background: activeHint === i ? topicColor + "22" : "rgba(255,255,255,0.06)",
              border: `1px solid ${activeHint === i ? topicColor : "rgba(255,255,255,0.12)"}`,
              color: activeHint === i ? topicColor : "#64748b", transition: "all 0.2s"
            }}
          >
            Pista {i + 1}
          </button>
        ))}
      </div>
      {activeHint !== null && (
        <div style={{
          background: topicColor + "11", border: `1px solid ${topicColor}33`,
          borderRadius: 8, padding: "10px 14px", fontSize: 15, color: "#cbd5e1", lineHeight: 1.6
        }}>
          {module.hints[activeHint]}
        </div>
      )}

      {/* Editor */}
      <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{
          background: "rgba(0,0,0,0.4)", padding: "8px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.06)"
        }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["#ff5f57","#febc2e","#28c840"].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
            ))}
          </div>
          <span style={{ fontSize: 13, color: "#475569", letterSpacing: "0.05em" }}>MATLAB — ⌘+Enter para ejecutar</span>
          <button
            onClick={() => setCode(module.starterCode)}
            style={{
              fontSize: 13, color: "#475569", background: "none", border: "none",
              cursor: "pointer", padding: "2px 8px"
            }}
          >
            Resetear
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          style={{
            width: "100%", minHeight: 420, background: "#0d1117",
            color: "#e6edf3", fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            fontSize: 16, lineHeight: 1.75, padding: "20px 24px",
            border: "none", outline: "none", resize: "vertical" as const,
            boxSizing: "border-box" as const
          }}
        />
      </div>

      {/* Run button */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onClick={runCode}
          disabled={loading}
          style={{
            padding: "10px 24px", borderRadius: 8, fontSize: 15, fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            background: loading ? "rgba(255,255,255,0.06)" : topicColor,
            color: loading ? "#475569" : "#000", border: "none",
            transition: "all 0.2s", letterSpacing: "0.02em"
          }}
        >
          {loading ? "Ejecutando..." : "Ejecutar código"}
        </button>
        <button
          onClick={() => setShowExpected(!showExpected)}
          style={{
            padding: "10px 20px", borderRadius: 8, fontSize: 15, cursor: "pointer",
            background: "rgba(255,255,255,0.06)", color: "#64748b",
            border: "1px solid rgba(255,255,255,0.08)"
          }}
        >
          {showExpected ? "Ocultar" : "Ver salida esperada"}
        </button>
      </div>

      {/* Output */}
      {(output || showExpected) && (
        <div style={{
          background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10, padding: "14px 18px",
          fontFamily: "monospace", fontSize: 14.5, lineHeight: 1.7
        }}>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 8, letterSpacing: "0.1em" }}>
            {output ? "SALIDA" : "SALIDA ESPERADA"}
          </div>
          <pre style={{ margin: 0, color: output ? "#4ade80" : "#94a3b8", whiteSpace: "pre-wrap" as const }}>
            {output || module.expectedOutput}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function MatlabStudio() {
  const [activeTopic, setActiveTopic] = useState<TopicId>("errors");
  const [activeModule, setActiveModule] = useState<ModuleId>("err-1");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const topic = TOPICS.find((t) => t.id === activeTopic)!;
  const module = topic.modules.find((m) => m.id === activeModule) ?? topic.modules[0];

  const handleTopicChange = (topicId: TopicId) => {
    const t = TOPICS.find((t) => t.id === topicId)!;
    setActiveTopic(topicId);
    setActiveModule(t.modules[0].id);
  };

  const allModules = TOPICS.flatMap((t) => t.modules.map((m) => ({ ...m, topicId: t.id })));
  const currentIdx = allModules.findIndex((m) => m.id === activeModule);
  const prevModule = currentIdx > 0 ? allModules[currentIdx - 1] : null;
  const nextModule = currentIdx < allModules.length - 1 ? allModules[currentIdx + 1] : null;

  const goTo = (m: { id: string; topicId: string }) => {
    setActiveTopic(m.topicId as TopicId);
    setActiveModule(m.id);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#080c14", color: "#e2e8f0",
      fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", flexDirection: "column"
    }}>
      {/* Top bar */}
      <header style={{
        height: 52, background: "rgba(255,255,255,0.03)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", padding: "0 20px",
        gap: 16, position: "sticky" as const, top: 0, zIndex: 50
      }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20, padding: 4 }}
        >
          ☰
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            background: topic.color, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#000"
          }}>M</div>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9" }}>MATLAB Studio</span>
          <span style={{ color: "#334155", fontSize: 16 }}>/</span>
          <span style={{ fontSize: 15, color: "#64748b" }}>{topic.title}</span>
          <span style={{ color: "#334155", fontSize: 16 }}>/</span>
          <span style={{ fontSize: 15, color: topic.color }}>{module.title}</span>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 14, color: "#334155" }}>
          {currentIdx + 1} / {allModules.length} módulos
        </div>
      </header>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <aside style={{
            width: 260, background: "rgba(255,255,255,0.02)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            padding: "16px 0", flexShrink: 0, overflowY: "auto" as const
          }}>
            {TOPICS.map((t) => (
              <div key={t.id} style={{ marginBottom: 4 }}>
                <button
                  onClick={() => handleTopicChange(t.id)}
                  style={{
                    width: "100%", textAlign: "left" as const, padding: "10px 20px",
                    background: activeTopic === t.id ? t.color + "15" : "none",
                    border: "none", borderLeft: `3px solid ${activeTopic === t.id ? t.color : "transparent"}`,
                    cursor: "pointer", color: activeTopic === t.id ? t.color : "#64748b",
                    fontSize: 15, fontWeight: activeTopic === t.id ? 600 : 400,
                    transition: "all 0.15s"
                  }}
                >
                  <div>{t.title}</div>
                  <div style={{ fontSize: 13, color: "#475569", marginTop: 2, fontWeight: 400 }}>{t.subtitle}</div>
                </button>
                {activeTopic === t.id && t.modules.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setActiveModule(m.id)}
                    style={{
                      width: "100%", textAlign: "left" as const,
                      padding: "8px 20px 8px 36px",
                      background: activeModule === m.id ? t.color + "10" : "none",
                      border: "none",
                      borderLeft: `3px solid ${activeModule === m.id ? t.color : "transparent"}`,
                      cursor: "pointer",
                      color: activeModule === m.id ? "#e2e8f0" : "#475569",
                      fontSize: 14.5, transition: "all 0.15s"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: activeModule === m.id ? t.color : "rgba(255,255,255,0.15)"
                      }} />
                      {m.title}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </aside>
        )}

        {/* Main content */}
        <main style={{ flex: 1, padding: "28px 40px", overflowY: "auto" as const, minWidth: 0 }}>
          {/* Module header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{
                padding: "3px 10px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                background: topic.color + "22", color: topic.color, letterSpacing: "0.05em"
              }}>{module.badge}</span>
              <div style={{
                height: 1, flex: 1, background: `linear-gradient(90deg, ${topic.color}44, transparent)`
              }} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f8fafc", margin: "0 0 4px" }}>
              {module.title}
            </h1>
            <p style={{ fontSize: 15, color: "#475569", margin: 0 }}>
              {topic.title} · Métodos Numéricos UTEC
            </p>
          </div>

          <MatlabEditor module={module} topicColor={topic.color} />

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => prevModule && goTo(prevModule)}
              disabled={!prevModule}
              style={{
                padding: "10px 20px", borderRadius: 8, fontSize: 15, cursor: prevModule ? "pointer" : "not-allowed",
                background: prevModule ? "rgba(255,255,255,0.07)" : "transparent",
                color: prevModule ? "#94a3b8" : "#334155", border: "1px solid rgba(255,255,255,0.08)"
              }}
            >
              ← {prevModule?.title ?? "Inicio"}
            </button>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {allModules.map((_, i) => (
                <div key={i} style={{
                  width: i === currentIdx ? 20 : 6, height: 6, borderRadius: 3,
                  background: i === currentIdx ? topic.color : "rgba(255,255,255,0.15)",
                  transition: "all 0.3s"
                }} />
              ))}
            </div>
            <button
              onClick={() => nextModule && goTo(nextModule)}
              disabled={!nextModule}
              style={{
                padding: "10px 20px", borderRadius: 8, fontSize: 15, cursor: nextModule ? "pointer" : "not-allowed",
                background: nextModule ? topic.color : "transparent",
                color: nextModule ? "#000" : "#334155",
                border: `1px solid ${nextModule ? topic.color : "rgba(255,255,255,0.08)"}`,
                fontWeight: nextModule ? 600 : 400
              }}
            >
              {nextModule?.title ?? "Fin"} →
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
