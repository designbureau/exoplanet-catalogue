// @ts-nocheck
/* eslint-disable */
// GENERATED — TSL port of the original GLSL (ringFragmentShader), produced with three's GLSL→TSL
// transpiler (examples/jsm/transpiler) and then adapted: uniforms arrive as TSL
// uniform nodes via `reference()`, varyings are injected by the host material.
// This file is now the source of truth; hand-edit as needed.

export default function build( TSL: any, uniforms: any, varyings: any, lib: any ): Record<string, any> {

	const { frontFacing, reference, sin, fract, Fn, floor, mul, sub, mix, float, Loop, clamp, smoothstep, add, dot, length, If, max, property, vec4 } = TSL;
	const { vUv, vWorldPos, vNormal, vRadius } = varyings;

	const u_color1 = reference( 'value', 'color', uniforms[ 'u_color1' ] );
	const u_color2 = reference( 'value', 'color', uniforms[ 'u_color2' ] );
	const u_color3 = reference( 'value', 'color', uniforms[ 'u_color3' ] );
	const u_innerRadius = reference( 'value', 'float', uniforms[ 'u_innerRadius' ] );
	const u_outerRadius = reference( 'value', 'float', uniforms[ 'u_outerRadius' ] );
	const u_seed = reference( 'value', 'float', uniforms[ 'u_seed' ] );
	const u_sunDirection = reference( 'value', 'vec3', uniforms[ 'u_sunDirection' ] );
	const u_opacity = reference( 'value', 'float', uniforms[ 'u_opacity' ] );
	const u_planetPos = reference( 'value', 'vec3', uniforms[ 'u_planetPos' ] );
	const u_planetRadius = reference( 'value', 'float', uniforms[ 'u_planetRadius' ] );

	// Simple hash for band variation

	const hash = /*@__PURE__*/ Fn( ( [ p ] ) => {

		return fract( sin( p.mul( 127.1 ) ).mul( 43758.5453123 ) );

	}, { p: 'float', return: 'float' } );

	// 1D noise

	const noise1d = /*@__PURE__*/ Fn( ( [ p ] ) => {

		const i = floor( p );
		const f = fract( p );
		const u = f.mul( f ).mul( sub( 3.0, mul( 2.0, f ) ) );

		return mix( hash( i ), hash( i.add( 1.0 ) ), u );

	}, { p: 'float', return: 'float' } );

	// FBM for ring bands

	const fbm1d = /*@__PURE__*/ Fn( ( [ p_immutable ] ) => {

		const p = p_immutable.toVar();
		const v = float( 0.0 ), a = float( 0.5 );

		Loop( 6, () => {

			v.addAssign( a.mul( noise1d( p ) ) );
			p.assign( p.mul( 2.1 ).add( u_seed.mul( 10.0 ) ) );
			a.mulAssign( 0.5 );

		} );

		return v;

	} );

	const fragMain = /*@__PURE__*/ Fn( () => {

		// Use computed radial distance (0=inner edge, 1=outer edge)

		const r = clamp( vRadius, 0.0, 1.0 );

		// Soft edges

		const edgeFade = smoothstep( 0.0, 0.08, r ).mul( smoothstep( 1.0, 0.92, r ) );

		// Procedural band pattern (radial stripes like Saturn)

		const bandFreq = add( 30.0, u_seed.mul( 20.0 ) );
		const bands = fbm1d( r.mul( bandFreq ) );

		// Add sharper divisions (Cassini division style)

		const divisions = smoothstep( 0.42, 0.44, r ).mul( smoothstep( 0.48, 0.46, r ) );
		const division2 = smoothstep( 0.72, 0.73, r ).mul( smoothstep( 0.76, 0.75, r ) );
		const gapDarken = sub( 1.0, divisions.mul( 0.7 ) ).sub( division2.mul( 0.5 ) ).toVar();

		// Additional fine gaps from noise

		const fineGaps = smoothstep( 0.45, 0.5, noise1d( r.mul( 80.0 ).add( u_seed.mul( 50.0 ) ) ) );
		gapDarken.mulAssign( mix( 1.0, 0.6, sub( 1.0, fineGaps ).mul( 0.3 ) ) );

		// Colour: blend based on band noise and radial position

		const color = mix( u_color1, u_color2, bands ).toVar();
		color.assign( mix( color, u_color3, smoothstep( 0.6, 0.9, r ).mul( 0.5 ) ) );

		// Apply gaps

		color.mulAssign( gapDarken );

		// Planet shadow: check if this ring fragment is behind the planet relative to sun

		const toFrag = vWorldPos.sub( u_planetPos );

		// Project onto sun direction — if behind planet and within planet radius, it's in shadow

		const projDist = dot( toFrag, u_sunDirection.negate() );
		const perpOffset = toFrag.add( u_sunDirection.mul( projDist ) );
		const perpDist = length( perpOffset );
		const shadow = float( 1.0 ).toVar();

		If( projDist.greaterThan( 0.0 ).and( perpDist.lessThan( u_planetRadius ) ), () => {

			shadow.assign( smoothstep( u_planetRadius.mul( 0.8 ), u_planetRadius, perpDist ) );

		} );

		// Ring lighting with translucency
		// Front: full diffuse reflection
		// Back: transmitted light passes through thin ring material

		const sunDot = dot( vNormal, u_sunDirection );
		const frontLight = max( sunDot, 0.0 );
		const backLight = max( sunDot.negate(), 0.0 );

		// Forward scattering: light passing through the ring from behind
		// Thinner parts (higher alpha = denser = less transmission)

		const transmission = backLight.mul( 0.4 );

		// 40% light passes through

		const light = float( 0.0 ).toVar();

		If( frontFacing, () => {

			light.assign( frontLight.add( transmission.mul( 0.3 ) ) );

		} ).Else( () => {

			light.assign( backLight.mul( 0.15 ).add( transmission ) );

		} );

		const ambient = float( 0.06 );
		color.mulAssign( ambient.add( sub( 1.0, ambient ).mul( light ) ).mul( add( 0.3, mul( 0.7, shadow ) ) ) );

		// Overall opacity with soft edges

		const alpha = edgeFade.mul( u_opacity ).mul( add( 0.5, bands.mul( 0.5 ) ) );

		return vec4( color, alpha );

	} );
	return { u_color1, u_color2, u_color3, u_innerRadius, u_outerRadius, u_seed, u_sunDirection, u_opacity, u_planetPos, u_planetRadius, hash, noise1d, fbm1d, fragMain };

}
