// @ts-nocheck
/* eslint-disable */
// GENERATED — TSL port of the original GLSL (gasGiantFragment), produced with three's GLSL→TSL
// transpiler (examples/jsm/transpiler) and then adapted: uniforms arrive as TSL
// uniform nodes via `reference()`, varyings are injected by the host material.
// This file is now the source of truth; hand-edit as needed.

export default function build( TSL: any, uniforms: any, varyings: any, lib: any ): Record<string, any> {

	const { float, reference, length, clamp, sub, sin, cos, mat2, mix, Fn, abs, add, vec3, normalize, smoothstep, sqrt, mul, cameraPosition, vec4 } = TSL;
	const { vPosition, vNormal, vWorldNormal, vWorldPosition } = varyings;
	const { u_seed, u_lod, mod289v3, mod289v4, permute, taylorInvSqrt, fade, cnoise, pnoise3d, hash, hash3, noise, noise3d, fbm, fbm3d, hiFBM, hiRidged, hiInvRidged, hiCloud, ridgedNoise, cloudNoise, enhanceContrast, voronoi, craterProfile, sobelNormal, seededPos, u_sunDirection, u_sunDirectionLocal, u_ambient, u_lavaAmbient, u_wrapRange, u_wrapPower, u_sunIntensity, u_atmosDayColor, u_atmosTwilightColor, u_atmosIntensity, u_atmosFalloff, wrapDiffuse, fresnelAmbient, planetLighting, applyAtmosphere, fbm3d_lod, ridgedNoise_lod, cloudNoise_lod } = lib;

	const u_time = reference( 'value', 'float', uniforms[ 'u_time' ] );
	const scale = reference( 'value', 'float', uniforms[ 'scale' ] );
	const swirl_strength = reference( 'value', 'float', uniforms[ 'swirl_strength' ] );
	const swirl_speed = reference( 'value', 'float', uniforms[ 'swirl_speed' ] );
	const warp_intensity = reference( 'value', 'float', uniforms[ 'warp_intensity' ] );
	const u_gasWarp = reference( 'value', 'float', uniforms[ 'u_gasWarp' ] );
	const u_gasStorm = reference( 'value', 'float', uniforms[ 'u_gasStorm' ] );
	const u_gasTurb = reference( 'value', 'float', uniforms[ 'u_gasTurb' ] );
	const u_gasBands = reference( 'value', 'float', uniforms[ 'u_gasBands' ] );
	const u_gasEdgeNoise = reference( 'value', 'float', uniforms[ 'u_gasEdgeNoise' ] );
	const color1 = reference( 'value', 'color', uniforms[ 'color1' ] );
	const color2 = reference( 'value', 'color', uniforms[ 'color2' ] );
	const color3 = reference( 'value', 'color', uniforms[ 'color3' ] );
	const color4 = reference( 'value', 'color', uniforms[ 'color4' ] );
	const emissiveColor = reference( 'value', 'color', uniforms[ 'emissiveColor' ] );
	const emissiveIntensity = reference( 'value', 'float', uniforms[ 'emissiveIntensity' ] );

	// 3D storm vortex: swirl the XZ plane near a point on the sphere

	const stormVortex3D = /*@__PURE__*/ Fn( ( [ p, center, radius, strength ] ) => {

		const d = p.sub( center );
		const dist = length( d );
		const t = sub( 1.0, clamp( dist.div( radius ), 0.0, 1.0 ) ).toVar();
		t.assign( t.mul( t ).mul( t ) );

		// cubic falloff for tight eye

		const angle = strength.mul( t );
		const sa = sin( angle );
		const ca = cos( angle );

		// Rotate in the tangent plane (XZ relative to storm centre)

		const result = p.toVar();
		result.xz.assign( center.xz.add( mat2( ca, sa.negate(), sa, ca ).mul( p.xz.sub( center.xz ) ) ) );

		// Slight Y compression towards storm eye

		result.y.assign( mix( p.y, center.y, t.mul( 0.3 ) ) );

		return result;

	}, { p: 'vec3', center: 'vec3', radius: 'float', strength: 'float', return: 'vec3' } );

	const fragMain = /*@__PURE__*/ Fn( () => {

		const p = vPosition.toVar();
		const latitude = abs( p.y );

		// Coriolis: rotate XZ plane — faster at equator, slower at poles

		const rotAngle = u_time.mul( sub( 1.0, latitude.mul( 0.6 ) ) ).mul( swirl_speed ).mul( 0.02 );
		const cr = cos( rotAngle );
		const sr = sin( rotAngle );
		p.xz.assign( mat2( cr, sr.negate(), sr, cr ).mul( p.xz ) );

		// Storm vortices

		const storm1Pos = normalize( vec3( cos( u_seed.x.mul( 6.28 ) ), add( 0.25, u_seed.y.mul( 0.15 ) ), sin( u_seed.x.mul( 6.28 ) ) ) );
		p.assign( stormVortex3D( p, storm1Pos, 0.45, swirl_strength.mul( u_gasStorm ) ) );
		const storm2Pos = normalize( vec3( cos( u_seed.y.mul( 6.28 ).add( 2.5 ) ), float( -0.3 ).sub( u_seed.z.mul( 0.15 ) ), sin( u_seed.y.mul( 6.28 ).add( 2.5 ) ) ) );
		p.assign( stormVortex3D( p, storm2Pos, 0.3, swirl_strength.mul( u_gasStorm.negate() ).mul( 0.67 ) ) );
		const storm3Pos = normalize( vec3( cos( u_seed.z.mul( 6.28 ).add( 1.0 ) ), 0.55, sin( u_seed.z.mul( 6.28 ).add( 1.0 ) ) ) );
		p.assign( stormVortex3D( p, storm3Pos, 0.2, swirl_strength.mul( u_gasStorm ).mul( 0.55 ) ) );
		const storm4Pos = normalize( vec3( cos( u_seed.x.mul( 6.28 ).add( 4.0 ) ), - 0.1, sin( u_seed.x.mul( 6.28 ).add( 4.0 ) ) ) );
		p.assign( stormVortex3D( p, storm4Pos, 0.22, swirl_strength.mul( u_gasStorm.negate() ).mul( 0.44 ) ) );
		const storm5Pos = normalize( vec3( cos( u_seed.z.mul( 6.28 ).add( 3.2 ) ), 0.7, sin( u_seed.z.mul( 6.28 ).add( 3.2 ) ) ) );
		p.assign( stormVortex3D( p, storm5Pos, 0.15, swirl_strength.mul( u_gasStorm ).mul( 0.39 ) ) );

		// Stretched 3D coords for banding

		const bp = vec3( p.x, p.y.mul( scale ).mul( 0.5 ), p.z ).add( u_seed.mul( 5.0 ) );

		// Domain warp (IQ technique)

		const n1 = fbm3d( bp );
		const n2 = fbm3d( bp.add( vec3( 5.2, 1.3, 7.4 ) ) );
		const r1 = fbm3d( bp.add( u_gasWarp.mul( vec3( n1, n2, n1.mul( 0.5 ) ) ) ).add( vec3( 1.7, 9.2, 3.1 ) ).add( vec3( 0.0, 0.0, u_time.mul( 0.008 ) ) ) );
		const r2 = fbm3d( bp.add( u_gasWarp.mul( vec3( n1, n2, n2.mul( 0.5 ) ) ) ).add( vec3( 8.3, 2.8, 5.7 ) ).add( vec3( 0.0, 0.0, u_time.mul( 0.006 ) ) ) );
		const f = fbm3d( bp.add( u_gasWarp.mul( vec3( r1, r2, r1.mul( 0.7 ) ) ) ) );

		// Band structure

		const bandY = p.y.mul( scale ).mul( 0.5 );
		const edgeNoise = noise3d( bp.mul( 3.0 ) ).mul( 0.7 ).add( noise3d( bp.mul( 7.0 ) ).mul( 0.3 ) ).mul( u_gasEdgeNoise );
		const bandPhase = bandY.mul( u_gasBands ).add( n1.mul( 2.5 ) ).add( edgeNoise );
		const band1 = sin( bandPhase ).mul( 0.5 ).add( 0.5 );

		// Turbulence at band edges

		const bandEdge = abs( cos( bandPhase ) );
		const turbNoise = noise3d( bp.mul( 10.0 ).add( vec3( u_time.mul( 0.012 ) ) ) );
		const turbulence = bandEdge.mul( turbNoise ).mul( u_gasTurb ).mul( 0.5 );
		const wispTurb = abs( r1.sub( r2 ) ).mul( bandEdge ).mul( u_gasTurb );
		const band2Phase = bandY.mul( u_gasBands ).mul( 2.5 ).add( n2.mul( 3.5 ) ).add( f.mul( 2.5 ) ).add( edgeNoise.mul( 2.0 ) );
		const band2 = sin( band2Phase ).mul( 0.5 ).add( 0.5 );

		// Colour mapping

		const color = mix( color1, color2, smoothstep( 0.3, 0.7, band1 ) ).toVar();
		color.assign( mix( color, color3, clamp( sqrt( n1.mul( n1 ).add( n2.mul( n2 ) ) ), 0.0, 1.0 ).mul( 0.5 ) ) );
		color.assign( mix( color, color4, smoothstep( 0.3, 0.8, r2 ).mul( 0.3 ) ) );
		color.mulAssign( add( 0.8, mul( 0.4, f ) ) );
		color.mulAssign( add( 0.9, mul( 0.2, band2 ) ) );

		// Turbulence brightens and mixes band edges chaotically

		color.addAssign( color3.mul( turbulence ) );
		color.assign( mix( color, color4, wispTurb ) );

		// Storm eye darkening — darken the very centre of large storms

		const d1 = length( p.sub( storm1Pos ) );
		const eye1 = smoothstep( 0.08, 0.0, d1 );
		color.assign( mix( color, color3.mul( 0.6 ), eye1.mul( 0.5 ) ) );
		const d2 = length( p.sub( storm2Pos ) );
		const eye2 = smoothstep( 0.05, 0.0, d2 );
		color.assign( mix( color, color3.mul( 0.6 ), eye2.mul( 0.4 ) ) );

		// Polar darkening

		color.mulAssign( sub( 1.0, latitude.mul( 0.2 ) ) );

		// ── Subtle cloud belt normal perturbation ──
		// Domain warp difference gives gentle organic relief (no extra noise)
		// Band derivative kept very low to avoid stripey look

		const beltBump = vec3( r1.sub( r2 ).mul( 0.08 ), cos( bandPhase ).mul( 0.02 ), n1.sub( n2 ).mul( 0.06 ) );
		const gasNormal = normalize( vWorldNormal.add( beltBump ) );
		const V = normalize( cameraPosition.sub( vWorldPosition ) );
		color.assign( planetLighting( color, gasNormal, u_sunDirection, V, u_ambient ) );
		color.assign( applyAtmosphere( color, vWorldNormal, vWorldPosition ) );

		return vec4( color, 1.0 );

	} );
	return { u_time, scale, swirl_strength, swirl_speed, warp_intensity, u_gasWarp, u_gasStorm, u_gasTurb, u_gasBands, u_gasEdgeNoise, color1, color2, color3, color4, emissiveColor, emissiveIntensity, stormVortex3D, fragMain };

}
