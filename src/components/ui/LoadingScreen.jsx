import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import appIconSrc from '../../../assets/MounteaInventoryManager_Icon.png';

const TIPS = [
	'Use Ctrl+Z to undo and Ctrl+Y to redo changes',
	'Organize items with categories and subcategories',
	'Loadouts help you group related equipment sets',
	'Export your inventory to share with your team',
	'Assign gameplay tags to items for precise slot matching',
	'Crafting recipes link ingredients to craftable output items',
	'Item flags like Stackable and Durable control gameplay behaviour',
	'The taxonomy drives categories, rarities, and item actions',
	'Attachment slots let items accept scope, grip, and magazine mods',
	'Price coefficient scales with durability at max condition',
	'Duplicate an item from the context menu to create variants',
	'Import .mnteainventory files to bring in items from other workspaces',
];

export function LoadingScreen({ isLoading = true, onLoadingComplete }) {
	const [currentTipIndex, setCurrentTipIndex] = useState(0);
	const [fadeOut, setFadeOut] = useState(false);
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		if (!isLoading) return;
		const interval = setInterval(() => {
			setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
		}, 3000);
		return () => clearInterval(interval);
	}, [isLoading]);

	useEffect(() => {
		if (!isLoading) {
			setFadeOut(true);
			const timeout = setTimeout(() => {
				setVisible(false);
				onLoadingComplete?.();
			}, 500);
			return () => clearTimeout(timeout);
		}
	}, [isLoading, onLoadingComplete]);

	if (!visible) return null;

	return (
		<div
			className={`fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-500 ${
				fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
			}`}
		>
			{/* Subtle dot pattern using primary color */}
			<div className="absolute inset-0 opacity-[0.04]">
				<div className="absolute inset-0 bg-[radial-gradient(hsl(var(--primary))_1px,transparent_1px)] [background-size:24px_24px]" />
			</div>

			{/* Content */}
			<div className="relative z-10 flex flex-col items-center max-w-md px-8">
				{/* Logo */}
				<div className="mb-8 flex items-center gap-4">
					<img
						src={appIconSrc}
						alt="Mountea Inventour"
						className="w-16 h-16 rounded-2xl object-cover shadow-2xl"
					/>
					<div>
						<h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
							Mountea
						</h1>
						<p className="text-sm text-muted-foreground font-medium">
							Inventour
						</p>
					</div>
				</div>

				{/* Loading Animation */}
				<div className="mb-8 relative">
					<div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
					<div className="absolute inset-0 flex items-center justify-center">
						<Sparkles className="h-6 w-6 text-primary animate-pulse" />
					</div>
				</div>

				{/* Loading Text */}
				<p className="text-lg font-medium text-foreground mb-8 animate-pulse">
					Loading your workspace...
				</p>

				{/* Tips Section */}
				<div className="w-full bg-card/80 backdrop-blur-sm border border-border rounded-xl p-6 shadow-lg">
					<div className="flex items-start gap-3">
						<div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0 animate-pulse" />
						<div>
							<p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
								Tip
							</p>
							<p
								key={currentTipIndex}
								className="text-sm text-foreground leading-relaxed animate-fade-in"
							>
								{TIPS[currentTipIndex]}
							</p>
						</div>
					</div>
				</div>

				{/* Progress Indicator */}
				<div className="mt-8 flex gap-1.5">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={i}
							className="w-2 h-2 rounded-full bg-primary/30"
							style={{
								animation: `loading-dot 1.4s ease-in-out ${i * 0.16}s infinite`,
							}}
						/>
					))}
				</div>
			</div>

			{/* CSS animations */}
			<style>{`
				@keyframes loading-dot {
					0%, 80%, 100% {
						opacity: 0.3;
						transform: scale(1);
					}
					40% {
						opacity: 1;
						transform: scale(1.3);
					}
				}

				@keyframes fade-in {
					from {
						opacity: 0;
						transform: translateY(10px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				.animate-fade-in {
					animation: fade-in 0.5s ease-out;
				}
			`}</style>
		</div>
	);
}
