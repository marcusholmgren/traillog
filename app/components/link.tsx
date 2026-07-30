import * as Headless from '@headlessui/react'
import { NavLink, type NavLinkProps } from 'react-router'
import React, { forwardRef } from 'react'

export type LinkProps = { href?: NavLinkProps['to']; to?: NavLinkProps['to'] } & Omit<NavLinkProps, 'to'> &
  React.ComponentPropsWithoutRef<'a'>

export const Link = forwardRef(function Link(
  props: LinkProps,
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  const { href, to, ...rest } = props
  const target = href ?? to ?? ''
  return (
    <Headless.DataInteractive>
      <NavLink to={target} {...rest} ref={ref} />
    </Headless.DataInteractive>
  )
})

