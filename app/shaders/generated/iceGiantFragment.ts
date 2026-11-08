// @ts-nocheck
/* eslint-disable */
// GENERATED — TSL port of the original GLSL (iceGiantFragment), produced with three's GLSL→TSL
// transpiler (examples/jsm/transpiler) and then adapted: uniforms arrive as TSL
// uniform nodes via `reference()`, varyings are injected by the host material.
// This file is now the source of truth; hand-edit as needed.

export default function build( TSL: any, uniforms: any, varyings: any, lib: any ): Record<string, any> {

	const { float, reference, abs, sub, cos, sin, mat2, vec3, mix, clamp, smoothstep, mul, add, normalize, length, dot, max, cameraPosition, vec4, Fn } = TSL;
	const { vPosition, vNormal, vWorldNormal, vWorldPosition } = varyings;
	const { u_seed, u_lod, mod289v3, mod289v4, permute, taylorInvSqrt, fade, cnoise, pnoise3d, hash, hash3, noise, noise3d, fbm, fbm3d, hiFBM, hiRidged, hiInvRidged, hiCloud, ridgedNoise, cloudNoise, enhanceContrast, voronoi, craterProfile, sobelNormal, seededPos, u_sunDirection, u_sunDirectionLocal, u_ambient, u_lavaAmbient, u_wrapRange, u_wrapPower, u_sunIntensity, u_atmosDayColor, u_atmosTwilightColor, u_atmosIntensity, u_atmosFalloff, wrapDiffuse, fresnelAmbient, planetLighting, applyAtmosphere, fbm3d_lod, ridgedNoise_lod, cloudNoise_lod } = lib;

	const u_time = reference( 'value', 'float', uniforms[ 'u_time' ] );
	const scale = reference( 'value', 'float', uniforms[ 'scale' ] );
	const swirl_strength = reference( 'value', 'float', uniforms[ 'swirl_strength' ] );
	const swirl_speed = reference( 'value', 'float', uniforms[ 'swirl_speed' ] );
	const u_gasWarp = reference( 'value', 'float', uniforms[ 'u_gasWarp' ] );
	const u_gasStorm = reference( 'value', 'float', uniforms[ 'u_gasStorm' ] );
	const u_gasTurb = reference( 'value', 'float', uniforms[ 'u_gasTurb' ] );
	const u_gasBands = reference( 'value', 'float', uniforms[ 'u_gasBands' ] );
	const u_gasEdgeNoise = reference( 'value', 'float', uniforms[ 'u_gasEdgeNoise' ] );
	const color1 = reference( 'value', 'color', uniforms[ 'color1' ] );
	const color2 = reference( 'value', 'color', uniforms[ 'color2' ] );
	const color3 = reference( 'value', 'color', uniforms[ 'color3' ] );
	const color4 = reference( 'value', 'color', uniforms[ 'color4' ] );

	const fragMain = /*@__PURE__*/ Fn( () => {

		const p = vPosition.toVar();
		const latitude = abs( p.y );

		// Differential rotation

		const rotAngle = u_time.mul( sub( 1.0, latitude.mul( 0.3 ) ) ).mul( swirl_speed ).mul( 0.02 );
		const cr = cos( rotAngle );
		const sr = sin( rotAngle );
		p.xz.assign( mat2( cr, sr.negate(), sr, cr ).mul( p.xz ) );

		// 3D noise

		const bp = vec3( p.x, p.y.mul( scale ).mul( 0.3 ), p.z ).add( u_seed.mul( 5.0 ) );

		// Domain warp — controllable

		const n1 = fbm3d( bp );
		const n2 = fbm3d( bp.add( vec3( 5.2, 1.3, 7.4 ) ) );
		const r1 = fbm3d( bp.add( u_gasWarp.mul( 0.5 ).mul( vec3( n1, n2, n1.mul( 0.3 ) ) ) ).add( vec3( 0.0, 0.0, u_time.mul( 0.004 ) ) ) );
		const r2 = fbm3d( bp.add( u_gasWarp.mul( 0.4 ).mul( vec3( n2, r1, n1.mul( 0.5 ) ) ) ).add( vec3( 3.7, 8.1, u_time.mul( 0.003 ) ) ) );
		const f = fbm3d( bp.add( u_gasWarp.mul( 0.4 ).mul( vec3( r1, r2, r1.mul( 0.5 ) ) ) ) );

		// Faint banding with noise-disrupted edges

		const bandY = p.y.mul( scale ).mul( 0.3 );
		const edgeN = noise3d( bp.mul( 2.5 ) ).mul( 0.7 ).add( noise3d( bp.mul( 6.0 ) ).mul( 0.3 ) ).mul( u_gasEdgeNoise );
		const band = sin( bandY.mul( u_gasBands ).mul( 0.7 ).add( n1.mul( 1.0 ) ).add( edgeN ) ).mul( 0.5 ).add( 0.5 );
		const band2 = sin( bandY.mul( u_gasBands ).mul( 1.8 ).add( n2.mul( 2.0 ) ).add( f.mul( 1.5 ) ) ).mul( 0.5 ).add( 0.5 );

		// Colour with more variance across all 4 colours

		const color = mix( color1, color2, band.mul( 0.35 ).add( 0.32 ) ).toVar();
		color.assign( mix( color, color3, clamp( f.mul( 0.5 ).add( 0.2 ), 0.0, 1.0 ).mul( 0.2 ) ) );
		color.assign( mix( color, color4, smoothstep( 0.4, 0.7, r2 ).mul( 0.15 ) ) );
		color.mulAssign( add( 0.9, mul( 0.2, band2 ) ) );

		// Turbulent wispy detail between bands

		const bandEdge = abs( cos( bandY.mul( u_gasBands ).mul( 0.7 ).add( n1 ) ) );
		const turbDetail = bandEdge.mul( abs( r1.sub( r2 ) ) ).mul( u_gasTurb );
		color.assign( mix( color, color4.mul( 0.9 ), turbDetail.mul( 0.3 ) ) );

		// Polar brightening

		const polarBright = smoothstep( 0.5, 0.9, latitude ).mul( 0.15 );
		color.addAssign( color2.mul( polarBright ) );

		// Dark spot(s) with controllable prominence

		const spot1Pos = normalize( vec3( cos( u_seed.x.mul( 6.28 ) ), float( -0.2 ).add( u_seed.y.mul( 0.2 ) ), sin( u_seed.x.mul( 6.28 ) ) ) );
		const spot1 = smoothstep( 0.2, 0.0, length( p.sub( spot1Pos ) ) );
		color.assign( mix( color, color3.mul( 0.4 ), spot1.mul( u_gasStorm ).mul( 0.025 ) ) );

		// Bright companion cloud

		const compPos = normalize( spot1Pos.add( vec3( 0.15, 0.1, 0.0 ) ) );
		const comp = smoothstep( 0.08, 0.0, length( p.sub( compPos ) ) );
		color.assign( mix( color, color4.mul( 1.2 ), comp.mul( u_gasStorm ).mul( 0.03 ) ) );

		// Second dark spot

		const spot2Pos = normalize( vec3( cos( u_seed.z.mul( 6.28 ).add( 3.0 ) ), 0.4, sin( u_seed.z.mul( 6.28 ).add( 3.0 ) ) ) );
		const spot2 = smoothstep( 0.12, 0.0, length( p.sub( spot2Pos ) ) );
		color.assign( mix( color, color3.mul( 0.5 ), spot2.mul( u_gasStorm ).mul( 0.02 ) ) );

		// Overall haze variation

		color.mulAssign( add( 0.88, mul( 0.24, r1 ) ) );

		// Subtle limb darkening (no atmosphere shell for ice giants)

		const limb = max( dot( vNormal, normalize( vec3( 0.0, 0.0, 1.0 ) ) ), 0.0 );
		color.mulAssign( add( 0.85, mul( 0.15, limb ) ) );

		// ── Subtle belt normal perturbation ──

		const iceBeltBump = vec3( r1.sub( r2 ).mul( 0.05 ), cos( bandY.mul( u_gasBands ).mul( 0.7 ).add( n1 ) ).mul( 0.015 ), n1.sub( n2 ).mul( 0.04 ) );
		const iceNormal = normalize( vWorldNormal.add( iceBeltBump ) );
		const V = normalize( cameraPosition.sub( vWorldPosition ) );
		color.assign( planetLighting( color, iceNormal, u_sunDirection, V, u_ambient ) );
		color.assign( applyAtmosphere( color, vWorldNormal, vWorldPosition ) );

		return vec4( color, 1.0 );

	} );
	return { u_time, scale, swirl_strength, swirl_speed, u_gasWarp, u_gasStorm, u_gasTurb, u_gasBands, u_gasEdgeNoise, color1, color2, color3, color4, fragMain };

}
