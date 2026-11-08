// @ts-nocheck
/* eslint-disable */
// GENERATED — TSL port of the original GLSL (iceOceanFragment), produced with three's GLSL→TSL
// transpiler (examples/jsm/transpiler) and then adapted: uniforms arrive as TSL
// uniform nodes via `reference()`, varyings are injected by the host material.
// This file is now the source of truth; hand-edit as needed.

export default function build( TSL: any, uniforms: any, varyings: any, lib: any ): Record<string, any> {

	const { reference, dot, vec3, mix, smoothstep, sub, cameraPosition, normalize, reflect, max, pow, vec4, Fn } = TSL;
	const { vPosition, vNormal, vWorldNormal, vWorldPosition } = varyings;
	const { u_seed, u_lod, mod289v3, mod289v4, permute, taylorInvSqrt, fade, cnoise, pnoise3d, hash, hash3, noise, noise3d, fbm, fbm3d, hiFBM, hiRidged, hiInvRidged, hiCloud, ridgedNoise, cloudNoise, enhanceContrast, voronoi, craterProfile, sobelNormal, seededPos, u_sunDirection, u_sunDirectionLocal, u_ambient, u_lavaAmbient, u_wrapRange, u_wrapPower, u_sunIntensity, u_atmosDayColor, u_atmosTwilightColor, u_atmosIntensity, u_atmosFalloff, wrapDiffuse, fresnelAmbient, planetLighting, applyAtmosphere, fbm3d_lod, ridgedNoise_lod, cloudNoise_lod } = lib;

	const u_time = reference( 'value', 'float', uniforms[ 'u_time' ] );
	const scale = reference( 'value', 'float', uniforms[ 'scale' ] );
	const color1 = reference( 'value', 'color', uniforms[ 'color1' ] );
	const color2 = reference( 'value', 'color', uniforms[ 'color2' ] );
	const color3 = reference( 'value', 'color', uniforms[ 'color3' ] );
	const color4 = reference( 'value', 'color', uniforms[ 'color4' ] );
	const u_iceOceanPolarFade = reference( 'value', 'float', uniforms[ 'u_iceOceanPolarFade' ] );

	// 0=no polar cap, 1=polar cap fills most of night side

	const u_iceOceanEdgeNoise = reference( 'value', 'float', uniforms[ 'u_iceOceanEdgeNoise' ] );

	// 0=smooth pack/polar edge, 1=very ragged

	const u_iceOceanCrackDepth = reference( 'value', 'float', uniforms[ 'u_iceOceanCrackDepth' ] );

	// 0=cracks invisible, 1=deep dark water between floes

	const fragMain = /*@__PURE__*/ Fn( () => {

		const baseDir = vPosition.toVar();
		const p = baseDir.add( u_seed.mul( 100.0 ) );
		const sunAngle = dot( baseDir, u_sunDirectionLocal );

		// Noise for organic edge perturbation

		const edgeNoise = noise3d( baseDir.mul( 4.0 ).add( u_seed.mul( 20.0 ) ) ).sub( 0.5 ).mul( 0.12 );
		const fineNoise = noise3d( baseDir.mul( 8.0 ).add( u_seed.mul( 35.0 ) ) ).sub( 0.5 ).mul( 0.06 );
		const t = sunAngle.add( edgeNoise ).add( fineNoise );

		// Fully independent perturbation for the pack-ice → solid-ice boundary,
		// weighted toward higher frequencies so the polar edge breaks into fingers
		// and inlets instead of a smoothly wobbling band.

		const edgeAmp = u_iceOceanEdgeNoise.mul( 2.0 );
		const iceLarge = noise3d( baseDir.mul( 3.0 ).add( u_seed.mul( 62.0 ) ) ).sub( 0.5 ).mul( 0.20 ).mul( edgeAmp );
		const iceMid = noise3d( baseDir.mul( 7.0 ).add( u_seed.mul( 77.0 ) ) ).sub( 0.5 ).mul( 0.14 ).mul( edgeAmp );
		const iceFine = noise3d( baseDir.mul( 16.0 ).add( u_seed.mul( 91.0 ) ) ).sub( 0.5 ).mul( 0.07 ).mul( edgeAmp );
		const tIce = sunAngle.add( iceLarge ).add( iceMid ).add( iceFine ).toVar();

		// ── Zone colors ──
		// Deep open ocean (sub-stellar center)

		const deepOcean = color1.toVar();

		// Shallow ocean (sub-stellar edges, warmer water)

		const shallowOcean = color1.mul( 1.5 ).add( vec3( 0.04, 0.08, 0.1 ) );

		// Brash ice / slush — scattered floating chunks in dark water

		const slushBase = mix( color1, color4, 0.25 );
		const slushChunks = noise3d( baseDir.mul( 12.0 ).add( u_seed.mul( 45.0 ) ) );
		const slush = mix( slushBase, color4.mul( 0.7 ), smoothstep( 0.4, 0.6, slushChunks ).mul( 0.5 ) );

		// Unified ice surface — one material, cracks fade organically toward the
		// pole. No separate solid-ice layer, so the floe pattern stays connected
		// all the way from the terminator into the polar cap.

		const cracks = noise3d( baseDir.mul( 6.0 ).add( u_seed.mul( 30.0 ) ) );
		const fineCracks = noise3d( baseDir.mul( 15.0 ).add( u_seed.mul( 55.0 ) ) );

		// Tie the polar whitening to the same floe pattern that draws the cracks,
		// so the solid ice grows out of the floes rather than sitting on top.

		tIce.addAssign( cracks.sub( 0.5 ).mul( 0.22 ).add( fineCracks.sub( 0.5 ).mul( 0.08 ) ) );
		const iceTexture = noise3d( baseDir.mul( 5.0 ).add( u_seed.mul( 15.0 ) ) ).mul( 0.05 );
		const cleanIce = color4.add( iceTexture ).sub( 0.02 );

		// Per-floe jitter — each floe gets a random offset to its fade threshold
		// so neighbouring floes don't cross the pack→solid transition in sync.
		// This scatters the boundary across ~0.4 of sunAngle space, dissolving
		// any visible ring.

		const floeJitter = noise3d( baseDir.mul( 6.0 ).add( u_seed.mul( 44.0 ) ) ).sub( 0.5 ).mul( 0.45 ).add( noise3d( baseDir.mul( 2.5 ).add( u_seed.mul( 71.0 ) ) ).sub( 0.5 ).mul( 0.25 ) );

		// Low-frequency "cluster" jitter so whole regions of floes lose cracks
		// earlier/later than others — prevents a uniform scatter pattern too.
		// polarShift pushes the fade threshold: +ve values grow the polar cap.

		const polarShift = u_iceOceanPolarFade.sub( 0.5 ).mul( 0.8 );
		const crackStrength = smoothstep( - 0.5, 0.25, tIce.add( floeJitter ).sub( polarShift ) );

		// Single ice brightness everywhere — the transition from pack to polar
		// ice is carried entirely by how dark the water in the cracks is, not by
		// any overlay. At the pack front the cracks read as dark water between
		// floes; toward the pole those cracks fill with frozen slush/snow and
		// finally become hairline surface seams. Same floe pattern throughout.

		const ice = cleanIce.toVar();

		// Dark water in cracks fades continuously; floor at 0.35 so the floe
		// pattern still reads as subtle ice-grey seams at the pole.

		const crackDark = mix( 0.35, 1.0, crackStrength );
		const crackScale = u_iceOceanCrackDepth.mul( 2.0 );
		ice.assign( mix( ice, color1.mul( 0.5 ).add( vec3( 0.02, 0.04, 0.06 ) ), smoothstep( 0.42, 0.52, cracks ).mul( 0.55 ).mul( crackDark ).mul( crackScale ) ) );
		ice.assign( mix( ice, color1.mul( 0.6 ).add( vec3( 0.01, 0.03, 0.04 ) ), smoothstep( 0.44, 0.54, fineCracks ).mul( 0.28 ).mul( crackDark ).mul( crackScale ) ) );

		// At the pole only, faint bright hairlines along the same crack pattern —
		// gives the solid cap a sense of frozen-over seams instead of smooth white.

		const hairline = smoothstep( 0.47, 0.51, cracks ).mul( sub( 1.0, crackStrength ) ).mul( 0.08 );
		ice.addAssign( vec3( 0.02, 0.03, 0.04 ).mul( hairline ) );

		// ── Gradient: ocean → shallow → slush → ice ──

		const surface = deepOcean.toVar();
		surface.assign( mix( surface, shallowOcean, smoothstep( 0.6, 0.35, t ) ) );
		surface.assign( mix( surface, slush, smoothstep( 0.35, 0.2, t ) ) );

		// narrow slush band

		surface.assign( mix( surface, ice, smoothstep( 0.2, 0.0, t ) ) );

		// ice starts near terminator
		// ── Lighting ──

		const V = normalize( cameraPosition.sub( vWorldPosition ) );
		surface.assign( planetLighting( surface, vWorldNormal, u_sunDirection, V, u_ambient ) );

		// Ocean specular — strong on liquid, fading on ice

		const liquidAmount = smoothstep( - 0.1, 0.3, t );
		const reflectDir = reflect( u_sunDirection.negate(), vWorldNormal );
		const spec = pow( max( dot( normalize( vPosition.negate() ), reflectDir ), 0.0 ), 32.0 );
		const specShadow = wrapDiffuse( vWorldNormal, u_sunDirection );
		surface.addAssign( vec3( 0.35 ).mul( spec ).mul( specShadow ).mul( liquidAmount ) );

		// Atmospheric rim

		surface.assign( applyAtmosphere( surface, vWorldNormal, vWorldPosition ) );

		return vec4( surface, 1.0 );

	} );
	return { u_time, scale, color1, color2, color3, color4, u_iceOceanPolarFade, u_iceOceanEdgeNoise, u_iceOceanCrackDepth, fragMain };

}
