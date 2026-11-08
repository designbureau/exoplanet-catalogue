// @ts-nocheck
/* eslint-disable */
// GENERATED — TSL port of the original GLSL (rockyFragment), produced with three's GLSL→TSL
// transpiler (examples/jsm/transpiler) and then adapted: uniforms arrive as TSL
// uniform nodes via `reference()`, varyings are injected by the host material.
// This file is now the source of truth; hand-edit as needed.

export default function build( TSL: any, uniforms: any, varyings: any, lib: any ): Record<string, any> {

	const { reference, vec3, float, If, Fn, clamp, normalize, smoothstep, mix, mul, add, dot, select, cameraPosition, sub, vec4 } = TSL;
	const { vPosition, vNormal, vWorldNormal, vWorldPosition } = varyings;
	const { u_seed, u_lod, mod289v3, mod289v4, permute, taylorInvSqrt, fade, cnoise, pnoise3d, hash, hash3, noise, noise3d, fbm, fbm3d, hiFBM, hiRidged, hiInvRidged, hiCloud, ridgedNoise, cloudNoise, enhanceContrast, voronoi, craterProfile, sobelNormal, seededPos, u_sunDirection, u_sunDirectionLocal, u_ambient, u_lavaAmbient, u_wrapRange, u_wrapPower, u_sunIntensity, u_atmosDayColor, u_atmosTwilightColor, u_atmosIntensity, u_atmosFalloff, wrapDiffuse, fresnelAmbient, planetLighting, applyAtmosphere, fbm3d_lod, ridgedNoise_lod, cloudNoise_lod } = lib;

	const u_time = reference( 'value', 'float', uniforms[ 'u_time' ] );
	const scale = reference( 'value', 'float', uniforms[ 'scale' ] );
	const color1 = reference( 'value', 'color', uniforms[ 'color1' ] );
	const color2 = reference( 'value', 'color', uniforms[ 'color2' ] );
	const color3 = reference( 'value', 'color', uniforms[ 'color3' ] );
	const color4 = reference( 'value', 'color', uniforms[ 'color4' ] );
	const emissiveColor = reference( 'value', 'color', uniforms[ 'emissiveColor' ] );
	const emissiveIntensity = reference( 'value', 'float', uniforms[ 'emissiveIntensity' ] );
	const warp_intensity = reference( 'value', 'float', uniforms[ 'warp_intensity' ] );
	const u_craterScale = reference( 'value', 'float', uniforms[ 'u_craterScale' ] );
	const u_ridgeStrength = reference( 'value', 'float', uniforms[ 'u_ridgeStrength' ] );
	const u_craterDepth = reference( 'value', 'float', uniforms[ 'u_craterDepth' ] );
	const u_lavaWarp = reference( 'value', 'float', uniforms[ 'u_lavaWarp' ] );
	const u_lavaGlow = reference( 'value', 'float', uniforms[ 'u_lavaGlow' ] );
	const u_lavaHeightOffset = reference( 'value', 'float', uniforms[ 'u_lavaHeightOffset' ] );
	const u_lavaFlowScale = reference( 'value', 'float', uniforms[ 'u_lavaFlowScale' ] );
	const u_tidallyLocked = reference( 'value', 'float', uniforms[ 'u_tidallyLocked' ] );

	// Compute terrain height (LOD-aware)
	// Lava worlds: flowing domain-warped noise, no craters
	// Rocky worlds: ridged noise + craters

	const computeHeight = /*@__PURE__*/ Fn( ( [ p ] ) => {

		const _ret = float( 0.0 ).toVar();
		const isLava = emissiveIntensity.greaterThan( 0.01 );
		const base = noise3d( p.mul( 0.8 ) ).mul( 0.5 );

		If( isLava, () => {

			// Lava: domain-warped flowing terrain, no craters

			const wp = p.add( warp_intensity.mul( u_lavaWarp ).mul( vec3( noise3d( p.mul( 0.8 ).add( vec3( 5.0 ) ) ), noise3d( p.mul( 0.8 ).add( vec3( 9.0 ) ) ), noise3d( p.mul( 0.8 ).add( vec3( 13.0 ) ) ) ) ) );
			const flow1 = noise3d( wp.mul( u_lavaFlowScale ) ).mul( 0.5 );
			const flow2 = cloudNoise_lod( wp.add( vec3( flow1.mul( 0.3 ) ) ), u_lavaFlowScale.mul( 2.0 ) ).mul( 0.25 );
			const detail = float( 0.0 ).toVar();

			If( u_lod.greaterThan( 0.5 ), () => {

				detail.assign( noise3d( wp.mul( u_lavaFlowScale ).mul( 4.0 ).add( vec3( flow1 ) ) ).mul( 0.1 ) );

			} );

			_ret.assign( base.add( flow1 ).add( flow2 ).add( detail ).add( u_lavaHeightOffset ) );

		} ).Else( () => {

		// Rocky: ridged noise + craters

		const ridges = ridgedNoise_lod( p, 1.5 ).mul( u_ridgeStrength );
		const soft = cloudNoise_lod( p.add( vec3( ridges.mul( 0.3 ) ) ), 2.0 ).mul( 0.15 );
		const detail = float( 0.0 ).toVar();

		If( u_lod.greaterThan( 0.5 ), () => {

			const wp = p.add( warp_intensity.mul( 0.05 ).mul( vec3( noise3d( p.mul( 3.0 ).add( vec3( 5.0 ) ) ), noise3d( p.mul( 3.0 ).add( vec3( 9.0 ) ) ), noise3d( p.mul( 3.0 ).add( vec3( 13.0 ) ) ) ) ) );
			detail.assign( noise3d( wp.mul( 6.0 ) ).mul( 0.08 ) );

		} );

		const terrain = base.add( ridges ).add( soft ).add( detail ).toVar();
		const v0 = voronoi( p.mul( 0.18 ) );
		terrain.addAssign( craterProfile( v0.x, 3.5 ).mul( u_craterDepth ).mul( 0.6 ) );
		const v1 = voronoi( p.mul( 0.7 ).mul( u_craterScale ) );
		terrain.addAssign( craterProfile( v1.x, 2.0 ).mul( u_craterDepth ) );

		If( u_lod.greaterThan( 0.5 ), () => {

			const v2 = voronoi( p.mul( 1.8 ).mul( u_craterScale ) );
			terrain.addAssign( craterProfile( v2.x, 0.8 ).mul( 0.4 ) );
			const v3 = voronoi( p.mul( 5.0 ).mul( u_craterScale ) );
			terrain.addAssign( craterProfile( v3.x, 0.5 ).mul( 0.15 ) );

		} );

		_ret.assign( terrain );

		} );

		return _ret;

	} );

	const fragMain = /*@__PURE__*/ Fn( () => {

		const p = seededPos( vPosition, 100.0 ).mul( scale );
		const height = computeHeight( p );

		// Bump normal: only compute at high LOD

		const bumpNormal = vNormal.toVar();

		If( u_lod.greaterThan( 0.5 ), () => {

			const eps = float( 0.01 );
			const hx = computeHeight( p.add( vec3( eps, 0.0, 0.0 ) ) );
			const hy = computeHeight( p.add( vec3( 0.0, eps, 0.0 ) ) );
			const hz = computeHeight( p.add( vec3( 0.0, 0.0, eps ) ) );
			const bumpGrad = vec3( height.sub( hx ), height.sub( hy ), height.sub( hz ) ).div( eps ).toVar();
			bumpGrad.assign( clamp( bumpGrad, vec3( - 2.0 ), vec3( 2.0 ) ) );
			bumpNormal.assign( normalize( vNormal.add( bumpGrad.mul( 0.08 ) ) ) );

		} );

		// Colour based on height

		const h = height.add( 0.3 ).toVar();
		const color = mix( color1, color2, smoothstep( 0.15, 0.35, h ) ).toVar();
		color.assign( mix( color, color3, smoothstep( 0.35, 0.55, h ) ) );
		color.assign( mix( color, color4, smoothstep( 0.55, 0.75, h ) ) );

		// Fine surface roughness for colour variation

		color.mulAssign( add( 0.9, mul( 0.1, noise3d( p.mul( 40.0 ) ) ) ) );

		// ── Tidally locked lava: modulate shader parameters by sun angle ──

		const tidalHeat = float( 1.0 ).toVar();

		// 1.0 = normal, >1 = hotter, <1 = cooler

		If( u_tidallyLocked.greaterThan( 0.5 ).and( emissiveIntensity.greaterThan( 0.01 ) ), () => {

			// Use world-space normal vs world-space sun direction for correct orientation

			const sunAngle = dot( vWorldNormal, u_sunDirection );

			// Sub-stellar: molten — boost glow, lower terrain (more lava pools)

			const daySide = smoothstep( - 0.1, 0.5, sunAngle );

			// Anti-stellar: cooled — suppress glow, raise terrain (solidified crust)

			const nightSide = smoothstep( 0.1, - 0.5, sunAngle );
			tidalHeat.assign( mix( 0.08, 2.0, daySide ) );

			// 8% glow on night, 200% on day
			// Shift the height so day side has more low areas (lava pools)
			// and night side has more high areas (solidified crust)

			h.assign( h.sub( daySide.mul( 0.15 ) ).add( nightSide.mul( 0.2 ) ) );

			// Darken base color on night side (cooled black basalt)

			color.mulAssign( mix( 1.0, 0.2, nightSide ) );

		} );

		// Lighting — lava worlds have higher ambient (self-radiant heat)

		const ambient = select( emissiveIntensity.greaterThan( 0.01 ), u_lavaAmbient, u_ambient );
		const V = normalize( cameraPosition.sub( vWorldPosition ) );
		color.assign( planetLighting( color, vWorldNormal, u_sunDirection, V, ambient ) );

		// Emissive (for lava worlds) — glow in low areas + voronoi cracks
		// tidalHeat modulates everything: bright day side, dim night side

		const lavaEmit = smoothstep( 0.35, 0.0, h ).mul( u_lavaGlow ).mul( tidalHeat );
		color.addAssign( emissiveColor.mul( lavaEmit ) );
		const v1 = voronoi( p.mul( 0.3 ) );
		const cracks = sub( 1.0, smoothstep( 0.0, 0.1, v1.y.sub( v1.x ) ) ).toVar();
		cracks.mulAssign( cracks );
		cracks.mulAssign( smoothstep( 0.5, 0.15, h ).mul( u_lavaGlow ).mul( tidalHeat ) );
		color.addAssign( emissiveColor.mul( cracks ).mul( emissiveIntensity ) );
		color.assign( applyAtmosphere( color, vWorldNormal, vWorldPosition ) );

		return vec4( color, 1.0 );

	} );
	return { u_time, scale, color1, color2, color3, color4, emissiveColor, emissiveIntensity, warp_intensity, u_craterScale, u_ridgeStrength, u_craterDepth, u_lavaWarp, u_lavaGlow, u_lavaHeightOffset, u_lavaFlowScale, u_tidallyLocked, computeHeight, fragMain };

}
