// @ts-nocheck
/* eslint-disable */
// GENERATED — TSL port of the original GLSL (scatteringFragment), produced with three's GLSL→TSL
// transpiler (examples/jsm/transpiler) and then adapted: uniforms arrive as TSL
// uniform nodes via `reference()`, varyings are injected by the host material.
// This file is now the source of truth; hand-edit as needed.

export default function build( TSL: any, uniforms: any, varyings: any, lib: any ): Record<string, any> {

	const { reference, dot, mul, vec2, If, sqrt, Fn, cameraPosition, normalize, smoothstep, mix, sub, pow, vec4, Discard, min, select, max, float, add, vec3, Break, length, exp, Loop, clamp } = TSL;
	const { vWorldPosition, vNormal } = varyings;

	const uSunDirection = reference( 'value', 'vec3', uniforms[ 'uSunDirection' ] );
	const uPlanetCenter = reference( 'value', 'vec3', uniforms[ 'uPlanetCenter' ] );
	const uPlanetRadius = reference( 'value', 'float', uniforms[ 'uPlanetRadius' ] );
	const uAtmosRadius = reference( 'value', 'float', uniforms[ 'uAtmosRadius' ] );
	const uBetaR = reference( 'value', 'vec3', uniforms[ 'uBetaR' ] );

	// Rayleigh scattering coefficients

	const uBetaM = reference( 'value', 'float', uniforms[ 'uBetaM' ] );

	// Mie scattering coefficient

	const uHr = reference( 'value', 'float', uniforms[ 'uHr' ] );

	// Rayleigh scale height

	const uHm = reference( 'value', 'float', uniforms[ 'uHm' ] );

	// Mie scale height

	const uMieG = reference( 'value', 'float', uniforms[ 'uMieG' ] );

	// Henyey-Greenstein g parameter

	const uSunIntensity = reference( 'value', 'float', uniforms[ 'uSunIntensity' ] );
	const uSteps = reference( 'value', 'int', uniforms[ 'uSteps' ] );

	// 0 = fallback, 8 = reduced, 16 = full
	// Fallback uniforms (cheap path)

	const uAtmosDayColor = reference( 'value', 'color', uniforms[ 'uAtmosDayColor' ] );
	const uAtmosTwilightColor = reference( 'value', 'color', uniforms[ 'uAtmosTwilightColor' ] );
	const uFallbackIntensity = reference( 'value', 'float', uniforms[ 'uFallbackIntensity' ] );
	const uShellFalloff = reference( 'value', 'float', uniforms[ 'uShellFalloff' ] );
	const uShellInner = reference( 'value', 'float', uniforms[ 'uShellInner' ] );

	// Ray-sphere intersection (sphere at origin)

	const rsi = /*@__PURE__*/ Fn( ( [ r0, rd, sr ] ) => {

		const a = dot( rd, rd );
		const b = mul( 2.0, dot( rd, r0 ) );
		const c = dot( r0, r0 ).sub( sr.mul( sr ) );
		const d = b.mul( b ).sub( mul( 4.0, a ).mul( c ) );

		If( d.lessThan( 0.0 ), () => {

			return vec2( 1e5, - 1e5 );

		} );

		const sd = sqrt( d );

		return vec2( b.negate().sub( sd ).div( mul( 2.0, a ) ), b.negate().add( sd ).div( mul( 2.0, a ) ) );

	}, { r0: 'vec3', rd: 'vec3', sr: 'float', return: 'vec2' } );

	// Cheap fallback: smoothstep day/twilight (existing Layer 2 logic)

	const cheapAtmosphere = /*@__PURE__*/ Fn( () => {

		const viewDirection = normalize( vWorldPosition.sub( cameraPosition ) );
		const normal = normalize( vNormal );
		const sunOrientation = dot( uSunDirection, normal );
		const atmosphereDayMix = smoothstep( - 0.5, 1.0, sunOrientation );
		const color = mix( uAtmosTwilightColor, uAtmosDayColor, atmosphereDayMix );

		// BackSide sphere: dot(view, normal) is high at centre, 0 at limb — invert for edge glow

		const edge = dot( viewDirection, normal );
		const edgeAlpha = pow( sub( 1.0, smoothstep( 0.0, 0.5, edge ) ), uShellFalloff );
		const dayAlpha = smoothstep( - 0.5, 0.0, sunOrientation );
		const alpha = edgeAlpha.mul( dayAlpha ).mul( uFallbackIntensity );

		return vec4( color, alpha );

	} );

	const fragMain = /*@__PURE__*/ Fn( () => {

		// Fallback path for distant/tiny planets

		If( uSteps.lessThan( 1 ), () => {

			return cheapAtmosphere();

			return;

		} );

		// Ray setup: camera through this fragment, in planet-local space

		const rayOrigin = cameraPosition.sub( uPlanetCenter );
		const rayDir = normalize( vWorldPosition.sub( cameraPosition ) );

		// Intersect with atmosphere sphere

		const atmos = rsi( rayOrigin, rayDir, uAtmosRadius );

		If( atmos.x.greaterThan( atmos.y ), () => {

			Discard();

			return;

		} );

		// Clip to planet surface (don't march through the planet)

		const planet = rsi( rayOrigin, rayDir, uPlanetRadius );
		const marchEnd = select( planet.x.greaterThan( 0.0 ), min( atmos.y, planet.x ), atmos.y );
		const marchStart = max( atmos.x, 0.0 );

		If( marchEnd.lessThanEqual( marchStart ), () => {

			Discard();

			return;

		} );

		const stepSize = marchEnd.sub( marchStart ).div( float( uSteps ) );
		const halfSteps = uSteps.div( 2 ).toVar();

		If( halfSteps.lessThan( 1 ), () => {

			halfSteps.assign( 1 );

		} );

		// Phase functions

		const mu = dot( rayDir, uSunDirection );
		const mu2 = mu.mul( mu );
		const g2 = uMieG.mul( uMieG );
		const phaseR = mul( 3.0 / 16.0 * 3.141592653589793, add( 1.0, mu2 ) );
		const phaseM = mul( 3.0 / 8.0 * 3.141592653589793, sub( 1.0, g2 ).mul( mu2.add( 1.0 ) ) ).div( pow( add( 1.0, g2 ).sub( mul( 2.0, mu ).mul( uMieG ) ), 1.5 ).mul( add( 2.0, g2 ) ) );

		// Accumulators

		const totalR = vec3( 0.0 ).toVar();
		const totalM = vec3( 0.0 ).toVar();
		const odR = float( 0.0 ).toVar();
		const odM = float( 0.0 ).toVar();

		// Primary ray march

		const t = marchStart.toVar();

		Loop( 16, ( { i } ) => {

			If( i.greaterThanEqual( uSteps ), () => {

				Break();

			} );

			const pos = rayOrigin.add( rayDir.mul( t.add( stepSize.mul( 0.5 ) ) ) );
			const h = length( pos ).sub( uPlanetRadius );
			const hr = max( h.div( uPlanetRadius.mul( uHr ) ), 0.0 );
			const hm = max( h.div( uPlanetRadius.mul( uHm ) ), 0.0 );
			const dR = exp( hr.negate() ).mul( stepSize );
			const dM = exp( hm.negate() ).mul( stepSize );
			odR.addAssign( dR );
			odM.addAssign( dM );

			// Secondary ray march toward sun

			const sunStepSize = rsi( pos, uSunDirection, uAtmosRadius ).y.div( float( halfSteps ) );
			const sOdR = float( 0.0 ), sOdM = float( 0.0 );
			const st = float( 0.0 ).toVar();

			Loop( { start: 0, end: 8, name: 'j' }, ( { j } ) => {

				If( j.greaterThanEqual( halfSteps ), () => {

					Break();

				} );

				const sPos = pos.add( uSunDirection.mul( st.add( sunStepSize.mul( 0.5 ) ) ) );
				const sH = length( sPos ).sub( uPlanetRadius );
				sOdR.addAssign( exp( max( sH.div( uPlanetRadius.mul( uHr ) ), 0.0 ).negate() ).mul( sunStepSize ) );
				sOdM.addAssign( exp( max( sH.div( uPlanetRadius.mul( uHm ) ), 0.0 ).negate() ).mul( sunStepSize ) );
				st.addAssign( sunStepSize );

			} );

			const attn = exp( uBetaM.mul( odM.add( sOdM ) ).add( uBetaR.mul( odR.add( sOdR ) ) ).negate() );
			totalR.addAssign( dR.mul( attn ) );
			totalM.addAssign( dM.mul( attn ) );
			t.addAssign( stepSize );

		} );

		const scatter = uSunIntensity.mul( phaseR.mul( uBetaR ).mul( totalR ).add( phaseM.mul( uBetaM ).mul( totalM ) ) );

		// Optical depth for alpha (how opaque the atmosphere is along this ray)

		const totalOd = dot( uBetaR, vec3( odR ) ).div( 3.0 ).add( uBetaM.mul( odM ) );
		const alpha = sub( 1.0, exp( totalOd.negate().mul( 2.0 ) ) );

		return vec4( scatter, clamp( alpha, 0.0, 1.0 ) );

	} );
	return { uSunDirection, uPlanetCenter, uPlanetRadius, uAtmosRadius, uBetaR, uBetaM, uHr, uHm, uMieG, uSunIntensity, uSteps, uAtmosDayColor, uAtmosTwilightColor, uFallbackIntensity, uShellFalloff, uShellInner, rsi, cheapAtmosphere, fragMain };

}
