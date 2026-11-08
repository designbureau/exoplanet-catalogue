// @ts-nocheck
/* eslint-disable */
// GENERATED — TSL port of the original GLSL (hazyFragment), produced with three's GLSL→TSL
// transpiler (examples/jsm/transpiler) and then adapted: uniforms arrive as TSL
// uniform nodes via `reference()`, varyings are injected by the host material.
// This file is now the source of truth; hand-edit as needed.

export default function build( TSL: any, uniforms: any, varyings: any, lib: any ): Record<string, any> {

	const { reference, cos, sin, mat2, vec3, mix, clamp, smoothstep, abs, mul, add, cameraPosition, normalize, vec4, Fn } = TSL;
	const { vPosition, vNormal, vWorldNormal, vWorldPosition } = varyings;
	const { u_seed, u_lod, mod289v3, mod289v4, permute, taylorInvSqrt, fade, cnoise, pnoise3d, hash, hash3, noise, noise3d, fbm, fbm3d, hiFBM, hiRidged, hiInvRidged, hiCloud, ridgedNoise, cloudNoise, enhanceContrast, voronoi, craterProfile, sobelNormal, seededPos, u_sunDirection, u_sunDirectionLocal, u_ambient, u_lavaAmbient, u_wrapRange, u_wrapPower, u_sunIntensity, u_atmosDayColor, u_atmosTwilightColor, u_atmosIntensity, u_atmosFalloff, wrapDiffuse, fresnelAmbient, planetLighting, applyAtmosphere, fbm3d_lod, ridgedNoise_lod, cloudNoise_lod } = lib;

	const u_time = reference( 'value', 'float', uniforms[ 'u_time' ] );
	const scale = reference( 'value', 'float', uniforms[ 'scale' ] );
	const u_gasWarp = reference( 'value', 'float', uniforms[ 'u_gasWarp' ] );
	const u_gasBands = reference( 'value', 'float', uniforms[ 'u_gasBands' ] );
	const u_gasTurb = reference( 'value', 'float', uniforms[ 'u_gasTurb' ] );
	const u_gasEdgeNoise = reference( 'value', 'float', uniforms[ 'u_gasEdgeNoise' ] );
	const color1 = reference( 'value', 'color', uniforms[ 'color1' ] );
	const color2 = reference( 'value', 'color', uniforms[ 'color2' ] );
	const color3 = reference( 'value', 'color', uniforms[ 'color3' ] );
	const color4 = reference( 'value', 'color', uniforms[ 'color4' ] );

	const fragMain = /*@__PURE__*/ Fn( () => {

		const p = vPosition.toVar();

		// Slow global rotation

		const rotAngle = u_time.mul( 0.005 );
		const cr = cos( rotAngle );
		const sr = sin( rotAngle );
		p.xz.assign( mat2( cr, sr.negate(), sr, cr ).mul( p.xz ) );

		// 3D domain warp for thick swirling cloud tops

		const bp = p.mul( scale ).mul( 0.3 ).add( u_seed.mul( 5.0 ) );
		const n1 = fbm3d( bp );
		const n2 = fbm3d( bp.add( vec3( 4.1, 2.7, 6.3 ) ) );
		const r1 = fbm3d( bp.add( u_gasWarp.mul( 0.6 ).mul( vec3( n1, n2, n1.mul( 0.3 ) ) ) ).add( vec3( u_time.mul( 0.003 ) ) ) );
		const r2 = fbm3d( bp.add( u_gasWarp.mul( 0.5 ).mul( vec3( n2, r1, n1.mul( 0.4 ) ) ) ).add( vec3( 7.3, 3.1, u_time.mul( 0.002 ) ) ) );
		const f = fbm3d( bp.add( u_gasWarp.mul( 0.5 ).mul( vec3( r1, r2, r1.mul( 0.5 ) ) ) ) );

		// Broad banding through the haze

		const bandY = p.y.mul( scale ).mul( 0.2 );
		const edgeN = noise3d( bp.mul( 2.5 ) ).mul( u_gasEdgeNoise );
		const band = sin( bandY.mul( u_gasBands ).mul( 0.5 ).add( n1.mul( 1.5 ) ).add( edgeN ) ).mul( 0.5 ).add( 0.5 );

		// Colour with more variance: use all 4 colours

		const color = mix( color1, color2, band.mul( 0.5 ).add( 0.25 ) ).toVar();
		color.assign( mix( color, color3, clamp( f.mul( 0.6 ).add( 0.2 ), 0.0, 1.0 ).mul( 0.25 ) ) );
		color.assign( mix( color, color4, smoothstep( 0.4, 0.7, r2 ).mul( 0.2 ) ) );

		// Turbulent detail at cloud boundaries

		const turbDetail = abs( r1.sub( n2 ) ).mul( u_gasTurb );
		color.assign( mix( color, color3.mul( 1.1 ), turbDetail.mul( 0.3 ) ) );
		color.mulAssign( add( 0.85, mul( 0.3, r1 ) ) );
		const V = normalize( cameraPosition.sub( vWorldPosition ) );
		color.assign( planetLighting( color, vWorldNormal, u_sunDirection, V, u_ambient ) );
		color.assign( applyAtmosphere( color, vWorldNormal, vWorldPosition ) );

		return vec4( color, 1.0 );

	} );
	return { u_time, scale, u_gasWarp, u_gasBands, u_gasTurb, u_gasEdgeNoise, color1, color2, color3, color4, fragMain };

}
